import React, { useState, useEffect } from "react";
import Split from "react-split";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

import { Switch } from "../components/switch";
import { Toolbox } from "./components/Toolbox";
import { ChunkList } from "./components/ChunkList";
import { extractTextWithPlumber, extractTextWithOCR } from "./utils/pdf-extract-utils";
import { chunkText } from "./utils/chunk-utils";
// hypothetical bounding box overlay function
import { overlayBoundingBoxes } from "./utils/bounding-box-utils"; 
import { 
  createOCRWorker,
  drawBoundingBoxes,
  getBBoxesIndex,
  makeBBoxStorageKey,
  performOCRAndDrawBoundingBoxes, 
  setBBoxesIndex
} from "./utils/ocr-util";

// Typescript interface or type for chunk data
interface ChunkData {
  text: string;
  isLabel: boolean;
}

// Dynamically import PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfAnnotationTool: React.FC = () => {
  /** ======================
   *  States
   *  ====================== */
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);

  // Tool options
  const [selectedTool, setSelectedTool] = useState<"pdfplumber" | "ocr" | "default">("default");
  const [chunkSize, setChunkSize] = useState<number>(500);
  const [boundingBoxes, setBoundingBoxes] = useState<any[]>([]); // store bounding box data

  // Extracted text and chunks
  const [extractedText, setExtractedText] = useState<string>("");
  const [chunks, setChunks] = useState<ChunkData[]>([]);
  const [promptInput, setPromptInput] = useState<string>("");

  // UI/UX toggles
  const [viewText, setViewText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Zoom and Paper size
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [paperSize, setPaperSize] = useState<string>("Auto");

  // OCR control settings
  const [processAllPages, setProcessAllPages] = useState<boolean>(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true); 
  const [processedConfigs, setProcessedConfigs] = useState<Set<string>>(new Set()); // a particular PDF+level has been processed
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);

  // NEW/CHANGED: Let the user pick which segmentation level to use when drawing boxes
  // Could be: "symbol" for characters, "word", "line", or "paragraph".
  const [boundingBoxLevel, setBoundingBoxLevel] = useState<"symbol" | "word" | "line" | "paragraph">("word");

  // We instantiate the Tesseract Worker globally and reuse
  const [ocrWorker, setOcrWorker] = useState<any>(null);

  // OCR progress
  const [ocrProgress, setOcrProgress] = useState<{ progress: number; status: string }>({
    progress: 0,
    status: ""
  });

  // Results from iterative prompt
  const [promptResults, setPromptResults] = useState<string[]>([]);

  // For handling merges, we store the index of the “source” chunk. If null, we have no source yet.
  const [selectedMergeIndex, setSelectedMergeIndex] = useState<number | null>(null);

  /** ======================
   *  Lifecycle / Setup
   *  ====================== */
  useEffect(() => {
    const initializeWorker = async () => {
      const worker = await createOCRWorker((info) => {
        setOcrProgress({
          progress: info.progress,
          status: info.status,
        });
      });
      setOcrWorker(worker);
    };
    initializeWorker();

    return () => {
      if (ocrWorker) ocrWorker.terminate();
    };
  }, []);

  // Called when PDF loads successfully
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  // Simple progress bar UI
  const ProgressBar: React.FC = () => {
    return (
      <div className="mt-2 w-full bg-gray-600 h-10 rounded">
        <div
          className="bg-blue-400 h-2 rounded"
          style={{
            width: `${Math.floor(ocrProgress.progress * 100)}%`
          }}
        />
        <p className="text-xs mt-3">
          Status: OCR Discovery ({Math.round(ocrProgress.progress * 100)}%)
        </p>
      </div>
    );
  };

  /** ======================
   *  Handlers
   *  ====================== */
  const handleFileChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (file) {
      // Create local URL for PDF
      setPdfFile(URL.createObjectURL(file));
      // Clear old states
      setExtractedText("");
      setChunks([]);
      setPromptResults([]);
      setBoundingBoxes([]);
    }
  };

  const handleExportChunks = () => {
    // We'll store them in localStorage as JSON
    localStorage.setItem("EXPORTED_CHUNKS", JSON.stringify(chunks));
    alert("Chunks exported to localStorage!");
  };

  // (1) Merge All
const handleMergeAll = () => {
  if (chunks.length <= 1) {
    alert("Not enough chunks to merge!");
    return;
  }
  // Because each chunk is now an object { text, isLabel }, we do:
  const mergedText = chunks.map((chunk) => chunk.text).join("\n");
  
  // Re-create a single chunk object
  const mergedChunk = {
    text: mergedText,
    isLabel: false, // or true if you want it to be a label by default
  };

  setChunks([mergedChunk]);
};

// (2) Delete All
const handleDeleteAll = () => {
  if (!chunks.length) {
    alert("No chunks to delete!");
    return;
  }
  const confirmDel = window.confirm("Really delete ALL chunks?");
  if (confirmDel) {
    setChunks([]);
  }
};


  const handleBoundingBox = async () => {
    if (!pdfFile || !ocrWorker) return;
    
    setOcrLoading(true);
    setOcrProgress({ progress: 0, status: "starting bounding boxes..." });

    try {
        // If "Process All Pages" is on, loop all; else just currentPage
        const pagesToProcess = processAllPages ? [...Array(numPages).keys()].map(i => i + 1) : [currentPage];

        for (const pageNum of pagesToProcess) {
          // 1) Check if we already have bounding boxes for this PDF + page + level
          const key = makeBBoxStorageKey(pdfFile, pageNum, boundingBoxLevel);
          const existing = localStorage.getItem(key);
          if (existing) {
            // Already processed => show alert, automatically draw from localStorage
            alert(`Page ${pageNum} is already processed at level: ${boundingBoxLevel}. Loading from localStorage...`);
    
            // Optionally draw them right now, so user sees it:
            const boxes = JSON.parse(existing);
            drawBoundingBoxes("canvasId", boxes);
            continue; // skip re-processing
          } else {
             // 2) If not in localStorage, do the actual OCR + bounding box routine
              await performOCRAndDrawBoundingBoxes(
                ocrWorker,
                pdfFile,
                pageNum,
                "canvasId",
                paperSize,
                boundingBoxLevel
              );
          }


          // (NEW) If boundingBoxLevel === paragraph, convert those boxes to “chunks”
        if (boundingBoxLevel === "paragraph") {
          const paragraphKey = makeBBoxStorageKey(pdfFile, pageNum, "paragraph");
          const saved = localStorage.getItem(paragraphKey);
          if (saved) {
            // Each box is { text, bbox }, we only want the text
            const boxes = JSON.parse(saved);
            const newParagraphs = boxes.map((b: any) => b.text);
            // Add them to the “chunks” on the right
            setChunks((prev) => [
              ...prev,
              ...newParagraphs.map((p: string) => ({
                text: p,
                isLabel: false,
              })),
            ]);
          }
        }
      
        
      }

      setOcrProgress({ progress: 1, status: "done" });
        }
    catch (error) {
      console.error("Bounding box error:", error);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage((p) => p + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  // Chunk the text in memory
  const handleChunkify = () => {
    if (!extractedText) {
      console.warn("No text to chunkify.");
      return;
    }
    const rawChunks = chunkText(extractedText, chunkSize); // returns string[]
    const chunkObjects = rawChunks.map((c) => ({
      text: c,
      isLabel: false,
    }));
  setChunks(chunkObjects);
  };

  // Run a single prompt iteratively on each chunk
  const handleRunPrompt = async () => {
    if (!chunks.length || !promptInput) return;
    setPromptResults([]);
    setIsLoading(true);

    const results: string[] = [];
    for (const chunk of chunks) {
      const response = await dummySendPrompt(promptInput, chunk.text);
      results.push(response);
    }
    setPromptResults(results);
    setIsLoading(false);
  };

  const dummySendPrompt = async (prompt: string, chunk: string) => {
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(`Prompt: "${prompt}" on chunk: "${chunk.slice(0, 50)}..." => done`);
      }, 500);
    });
  };

  const handleRemovePDF = () => {
    if (!pdfFile) return;
  
    // Step 1: Are you sure you want to remove the PDF from the viewer?
    const confirmRemove = window.confirm("Are you sure you want to remove this PDF?");
    if (!confirmRemove) return;
  
    // Step 2: Do you also want to delete bounding-box data from localStorage?
    const deleteData = window.confirm(
      "Do you also want to DELETE all bounding-box data for this PDF from localStorage?"
    );
  
    if (deleteData) {
      // Remove all localStorage keys matching `BBOX::...pdfFile...`
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`BBOX::${pdfFile}`)) {
          localStorage.removeItem(key);
        }
      }
    }
  
    // Finally, clear your state so the PDF is removed from view
    setPdfFile(null);
    setExtractedText("");
    setChunks([]);
    setPromptResults([]);
    setBoundingBoxes([]);
    setNumPages(0);
    setCurrentPage(1);
    // Optionally reset boundingBoxLevel or other states if you want
  };
  

  const zoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  
  // Delete a chunk from the array
  const handleDeleteChunk = (index: number) => {
    setChunks((prev) => prev.filter((_, i) => i !== index));
    // If we were about to merge from or to this chunk, reset the selection
    if (selectedMergeIndex === index) {
      setSelectedMergeIndex(null);
    }
  };

  /**
   * Merge logic:
   * 1) If no chunk is selected yet, store this chunk index as the “source.”
   * 2) If a source chunk is already selected, then the user’s click is the “destination.”
   *    => We combine the source chunk text + the destination chunk text,
   *       remove the source chunk from the list, and clear `selectedMergeIndex`.
   */
  const handleMergeChunk = (destIndex: number) => {
    if (selectedMergeIndex === null) {
      // First click => set the source
      setSelectedMergeIndex(destIndex);
      alert(`Selected chunk #${destIndex + 1} as merge SOURCE...`);
    } else {
      const sourceIndex = selectedMergeIndex;
      setSelectedMergeIndex(null);
  
      if (sourceIndex === destIndex) {
        alert("Cannot merge a chunk with itself!");
        return;
      }
  
      const sourceIsLabel = chunks[sourceIndex].isLabel;
      const destIsLabel = chunks[destIndex].isLabel;
  
      // 1) If both are normal or exactly one is label => old single-chunk merge logic
      if (sourceIsLabel !== destIsLabel || (!sourceIsLabel && !destIsLabel)) {
        setChunks((prev) => {
          const newArr = [...prev];
          newArr[destIndex].text = newArr[sourceIndex].text + "\n" + newArr[destIndex].text;
          // remove source
          if (sourceIndex < destIndex) {
            newArr.splice(sourceIndex, 1);
          } else {
            newArr.splice(sourceIndex, 1);
          }
          return newArr;
        });
      }
      // 2) If both are labels => "merge label to label"
      else if (sourceIsLabel && destIsLabel) {
        mergeLabelToLabel(sourceIndex, destIndex);
      }
    }
  };
  

  const handleToggleLabel = (index: number) => {
    console.log("Toggling label for chunk index:", index);
    setChunks((prev) => {
      const newArr = [...prev];
      newArr[index].isLabel = !newArr[index].isLabel;
      console.log("New label state:", newArr[index].isLabel);
      return newArr;
    });
  };

  function mergeLabelToLabel(labelAIndex: number, labelBIndex: number) {
    setChunks((prev) => {
      const newArr = [...prev];
  
      // Make sure labelAIndex < labelBIndex
      let start = Math.min(labelAIndex, labelBIndex);
      let end = Math.max(labelAIndex, labelBIndex);
  
      // We'll merge all in-between *non-label* text into labelA's text
      let mergedText = newArr[start].text;
      for (let i = start + 1; i < end; i++) {
        if (!newArr[i].isLabel) {
          mergedText += "\n" + newArr[i].text;
        }
      }
      newArr[start].text = mergedText;
  
      // Then remove those in-between normal chunks
      for (let i = end - 1; i > start; i--) {
        if (!newArr[i].isLabel) {
          newArr.splice(i, 1);
          end--;
        }
      }
      return newArr;
    });
  }
  

  const handleMergeUntilNextLabel = (labelIndex: number) => {
    setChunks((prev) => {
      // We have labelIndex. 
      // We need to find the next label after labelIndex, or the end if none.
  
      let nextLabelIndex: number | null = null;
  
      for (let i = labelIndex + 1; i < prev.length; i++) {
        if (prev[i].isLabel) {
          nextLabelIndex = i;
          break;
        }
      }
  
      // If we found no next label, we might choose to do nothing or merge until end.
      // We'll show how to merge until end:
      if (nextLabelIndex === null) {
        nextLabelIndex = prev.length; 
        // i.e., pretend a label is at the end
      }
  
      // Merge all in-between *non-label* chunks into the chunk at labelIndex
      const newArr = [...prev];
      let mergedText = newArr[labelIndex].text;
  
      for (let i = labelIndex + 1; i < nextLabelIndex; i++) {
        if (!newArr[i].isLabel) {
          mergedText += "\n" + newArr[i].text;
        }
      }
      newArr[labelIndex].text = mergedText;
  
      // Remove those normal chunks from the array
      // from nextLabelIndex-1 down to labelIndex+1
      for (let j = nextLabelIndex - 1; j > labelIndex; j--) {
        if (!newArr[j].isLabel) {
          newArr.splice(j, 1);
          nextLabelIndex--;
        }
      }
  
      return newArr;
    });
  };
  
  const handleAutoDetect = () => {
    setChunks((prev) => {
      const newArr = [...prev];
  
      // 2) Mark paragraphs < 60 chars (ignoring whitespace) as label
      for (let chunk of newArr) {
        const cleanedText = chunk.text.replace(/\s+/g, "");
        if (cleanedText.length < 60) {
          chunk.isLabel = true;
        }
      }
  
      // 3) Merge consecutive labels
      let i = 0;
      while (i < newArr.length) {
        if (newArr[i].isLabel) {
          let j = i + 1;
          while (j < newArr.length && !newArr[j].isLabel) {
            j++;
          }
  
          let mergedText = newArr[i].text;
          for (let k = i + 1; k < j; k++) {
            if (!newArr[k].isLabel) {
              mergedText += "\n" + newArr[k].text;
            }
          }
          newArr[i].text = mergedText;
  
          for (let k = j - 1; k > i; k--) {
            if (!newArr[k].isLabel) {
              newArr.splice(k, 1);
              j--;
            }
          }
          i = j;
        } else {
          i++;
        }
      }
      return newArr;
    });
  };
  
  

  


  /** ======================
   *  Render
   *  ====================== */
  return (
    <div className="h-screen bg-gray-900 text-white">
      <Split
        className="flex h-full"
        sizes={[20, 50, 30]}
        minSize={300}
        gutterSize={10}
        gutterAlign="center"
        snapOffset={30}
      >
        {/* LEFT PANEL: PDF Viewer & Toolbox */}
        <div className="bg-gray-800 p-4 shadow-lg flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold mb-2">Toolbox</h2>

            <Toolbox
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              chunkSize={chunkSize}
              setChunkSize={setChunkSize}
              onChunkify={handleChunkify}
              isLoading={isLoading}
            />

            {selectedTool === "ocr" && (
              <div className="bg-gray-700 p-4 rounded mt-4">
                <h3 className="text-sm font-bold text-blue-400 mb-2">OCR Controls</h3>

                <div className="my-4">
                <div className="flex items-center gap-4">
                  <span className="text-gray-200 text-sm">Process All Pages</span>
                  <Switch
                    label=""
                    checked={processAllPages}
                    onChange={() => setProcessAllPages(!processAllPages)}
                  />
                  <button
                    onClick={handleBoundingBox}
                    className="mt-2 px-4 py-2 bg-green-500 rounded text-sm disabled:bg-gray-500"
                    disabled={ocrLoading || !pdfFile}
                  >
                    {ocrLoading ? "Processing..." : "Chunkify"}
                  </button>
                </div>
              </div>

              <div className="my-4">
                <div className="flex items-center gap-4">
                  <span className="text-gray-200 text-sm">Show Bounding Boxes</span>
                  <Switch
                    label=""
                    checked={showBoundingBoxes}
                    onChange={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  />
                </div>
              </div>

                {/** NEW/CHANGED: A small radio-group or dropdown for boundingBoxLevel */}
                <div className="mt-4">
                  <label className="text-sm font-bold text-gray-200">Bounding Level:</label>
                  <div className="flex flex-col mt-2 gap-1">
                    <label className="text-gray-200 text-sm">
                      <input
                        type="radio"
                        name="level"
                        value="symbol"
                        checked={boundingBoxLevel === "symbol"}
                        onChange={() => setBoundingBoxLevel("symbol")}
                      />
                      <span className="ml-2">Character (symbol)</span>
                    </label>
                    <label className="text-gray-200 text-sm">
                      <input
                        type="radio"
                        name="level"
                        value="word"
                        checked={boundingBoxLevel === "word"}
                        onChange={() => setBoundingBoxLevel("word")}
                      />
                      <span className="ml-2">Word</span>
                    </label>
                    <label className="text-gray-200 text-sm">
                      <input
                        type="radio"
                        name="level"
                        value="line"
                        checked={boundingBoxLevel === "line"}
                        onChange={() => setBoundingBoxLevel("line")}
                      />
                      <span className="ml-2">Line</span>
                    </label>
                    <label className="text-gray-200 text-sm">
                      <input
                        type="radio"
                        name="level"
                        value="paragraph"
                        checked={boundingBoxLevel === "paragraph"}
                        onChange={() => setBoundingBoxLevel("paragraph")}
                      />
                      <span className="ml-2">Paragraph</span>
                    </label>
                  </div>

                  <ProgressBar />
                </div>

              </div>
            )}
          </div>
        </div>

        {/* CENTER PANEL: PDF Viewer */}
        <div className="relative border-l border-r border-gray-700 bg-gray-700 flex flex-col">
          {/* Top controls */}
          <div className="flex justify-between items-center p-2 bg-gray-800">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="bg-blue-500 px-3 py-1 rounded disabled:bg-gray-500"
              >
                Prev
              </button>
              <span>
                Page {currentPage} of {numPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === numPages}
                className="bg-blue-500 px-3 py-1 rounded disabled:bg-gray-500"
              >
                Next
              </button>
            </div>
            {/* Zoom controls */}
            <div className="flex items-center gap-2 mr-20 border border-gray-600 ">
              <button
                onClick={zoomOut}
                className="bg-green-500 px-3 py-1 rounded disabled:bg-gray-500"
              >
                -
              </button>
              <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={zoomIn}
                className="bg-green-500 px-3 py-1 rounded disabled:bg-gray-500"
              >
                +
              </button>
            </div>
          </div>

          {pdfFile && (
      <button
        onClick={handleRemovePDF}
        className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded"
      >
        X
      </button>
    )}

         {/* PDF Viewer */}
<div className="flex-1 overflow-auto flex justify-center items-center">
  {pdfFile ? (
    <div
      style={{ 
        width: paperSize === "Auto" ? "100%" : paperSize === "A4" ? "595px" : "1000px",
        transform: `scale(${zoomLevel})`,
        transformOrigin: "center",
        position: "relative", 
      }}
      className="bg-gray-200 p-4"
    >
              <Document
                file={pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                className="flex-1 overflow-auto"
              >
                <Page
                  pageNumber={currentPage}
                  renderAnnotationLayer
                  renderTextLayer
                  onRenderSuccess={(page) => {
                    const canvas = document.getElementById("canvasId") as HTMLCanvasElement;
                    if (canvas) {
                      const viewport = page.getViewport({ scale: 1 });
                      canvas.width = viewport.width;
                      canvas.height = viewport.height;
                      canvas.style.width = `${viewport.width}px`;
                      canvas.style.height = `${viewport.height}px`;
                    }
                    // If "showBoundingBoxes" is ON, load bounding boxes from localStorage if they exist
                    if (showBoundingBoxes && pdfFile) {
                      const key = makeBBoxStorageKey(pdfFile, currentPage, boundingBoxLevel);
                      const saved = localStorage.getItem(key);

                      if (saved) {
                        const boxes = JSON.parse(saved);
                        drawBoundingBoxes("canvasId", boxes);
                      }
                    }
                  }}
                />

                </Document>

                {/* Add the Canvas Element */}
                <canvas
                  id="canvasId"
                  style={{
                    position: "absolute",
                    top: 15,
                    left: 10,
                    border: "10px solid yellow",
                    backgroundColor: "transparent",
                    pointerEvents: "none", 
                    zIndex: 2,
                  }}
                />
              </div>
            ) : (
              <div className="text-center">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="file-input text-sm text-gray-200 border border-gray-600 rounded-lg cursor-pointer bg-gray-700 focus:outline-none p-2"
                />
              </div>
            )}
          </div>

          {/* Paper size dropdown */}
          <div className="flex justify-center items-center p-2 bg-gray-800">
            <label htmlFor="paperSize" className="mr-2">
              Paper Size:
            </label>
            <select
              id="paperSize"
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1"
            >
              <option value="Auto">Auto</option>
              <option value="A4">A4</option>
              <option value="A3">A3</option>
              <option value="Letter">Letter</option>
            </select>
          </div>
        </div>

        {/* RIGHT PANEL: Chunk List & Prompt */}
        <div className="bg-gray-800 p-4 shadow-lg flex flex-col">
          {/* Prompt Input */}
          <div className="mb-2">
            <h2 className="text-xl font-bold mb-2 text-blue-400">Iterative Prompt</h2>
            <textarea
              className="w-full h-24 p-2 rounded bg-gray-700 text-gray-200 border border-gray-600"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Enter your prompt here..."
            />
            <button
              onClick={handleRunPrompt}
              disabled={!chunks.length || !promptInput || isLoading}
              className="mt-2 w-full px-4 py-2 bg-blue-500 rounded disabled:bg-gray-500"
            >
              {isLoading ? "Running prompt on chunks..." : "Run Prompt on Chunks"}
            </button>
          </div>

          {/*
    NEW: "Chunk Controller" with 4 creative options:
    1) Merge All
    2) Delete All
    3) Auto Detect 
    4) Export Chunks 
  */}
  <div className="mb-2 flex flex-wrap gap-2">
    <button
      onClick={handleMergeAll}
      className="px-3 py-1 bg-purple-600 rounded text-white text-sm"
    >
      Merge All
    </button>
    <button
      onClick={handleDeleteAll}
      className="px-3 py-1 bg-red-600 rounded text-white text-sm"
    >
      Delete All
    </button>

    <button
      onClick={handleAutoDetect}
      className="px-3 py-1 bg-yellow-600 rounded text-white text-sm"
    >
      Auto Detect
    </button>
    <button
      onClick={handleExportChunks}
      className="px-3 py-1 bg-blue-600 rounded text-white text-sm"
    >
      Export Chunks
    </button>
  </div>

          {/* The updated ChunkList with Delete & Merge buttons */}
          <ChunkList
            chunks={chunks}
            promptResults={promptResults}
            onDelete={handleDeleteChunk}
            onMerge={handleMergeChunk}
            onToggleLabel={handleToggleLabel}
            onMergeUntilNextLabel={handleMergeUntilNextLabel} // <-- New callback
            selectedMergeIndex={selectedMergeIndex}
          />
        </div>
      </Split>
    </div>
  );
};

export default PdfAnnotationTool;
