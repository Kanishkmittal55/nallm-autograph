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
import { overlayBoundingBoxes } from "./utils/bounding-box-utils"; // hypothetical bounding box overlay function
import { createOCRWorker, performOCR, performOCRAndDrawBoundingBoxes } from "./utils/ocr-util";

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
  const [chunks, setChunks] = useState<string[]>([]);
  const [promptInput, setPromptInput] = useState<string>("");

  // UI/UX toggles
  const [viewText, setViewText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Zoom and Paper size
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // State for zoom level
  const [paperSize, setPaperSize] = useState<string>("Auto"); // State for paper size

  // Ocr control settings
  const [processAllPages, setProcessAllPages] = useState<boolean>(false);
  const [boundingBoxPages, setBoundingBoxPages] = useState<boolean>(false);
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);

  // Approach 2 : Instantiate the worker globally and reuse
  // The OCR worker is instantiated once ( e.g. during component initialization and reused across multiple performOCR calls.)
  // A UseEffect hook or an equivalent lifecycle method initializes the worker and cleans it up when the component unmounts.

  // State to store the OCR worker 
  const [ocrWorker , setOcrWorker] = useState<any>(null); // Now OCR worker can be of different types one is tesseract worker

  // Initialize the OCR worker globally
  useEffect(() => {
    const initializeWorker = async () => {
      const worker = await createOCRWorker();
      setOcrWorker(worker);
    };

    initializeWorker();

    return () => {
      if (ocrWorker) ocrWorker.terminate(); // Clean up worker on component unmount
    };
  }, []);


  // Results from iterative prompt
  const [promptResults, setPromptResults] = useState<string[]>([]);

  /** ======================
   *  Lifecycle / Setup
   *  ====================== */
  // Called when PDF loads successfully
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
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

  const handleOCRProcessing = async () => {
    if (!pdfFile || !ocrWorker) return;

    setOcrLoading(true);
    try {
      const allChunks: string[] = [];

      if (processAllPages) {
        // Process all pages
        for (let page = 1; page <= numPages; page++) {
          const text = await performOCR(ocrWorker, pdfFile, page);
          allChunks.push(...chunkText(text, chunkSize)); // Chunk the extracted text
        }
      } else {
        // Process current page
        const text = await performOCR(ocrWorker, pdfFile, currentPage);
        allChunks.push(...chunkText(text, chunkSize)); // Chunk the extracted text
      }

      setChunks(allChunks); // Populate the chunk list
    } catch (error) {
      console.error("Error during OCR processing:", error);
    } finally {
      setOcrLoading(false);
    }
  };

  /*
This is the current code , now tell me why is the bounding box firstly appearing at the characterlevel, I need a toggle with levels, so like slider with fixed windows , and now this slider will appear below the Make Bounding Boxes section in the left panel , so below it  

Bounding Level - character , word , line , paragraph , and construct your own , option, leave the construct your own option empty for now , give me the changes and their location ( where to make them ) , to implement said functionality , once a user select the dials from word to character or character to word level, then the bounding boxes will get updated accordingly  */

  const handleBoundingBox = async () => {
    if (!pdfFile || !ocrWorker) return;
    try {

      if (boundingBoxPages) {
        // Bounding boxes on all pages
        for (let page = 1; page <= numPages; page++) {
          const text = await performOCRAndDrawBoundingBoxes(ocrWorker, pdfFile, page, "canvasId", paperSize);
          console.log("The blocks are : " ,text)
        }
      } else {
        // Bounding boxes only on current page
        const text = await performOCRAndDrawBoundingBoxes(ocrWorker, pdfFile, currentPage, "canvasId", paperSize);
        console.log("The blocks are : " ,text)
      }

    } catch (error) {
      console.error("Error during Bounding Box info processing:", error);
    } finally {
      setOcrLoading(false);
    }

  }

  // Go to next/prev page
  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage((p) => p + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  // Extract text (and bounding boxes) from PDF
  const handleExtract = async () => {
    if (!pdfFile) return;
    setIsLoading(true);

    try {
      let text = "";
      let boxes: any[] = [];

      if (selectedTool === "pdfplumber") {
        // Placeholder function to handle pdfplumber logic in Node or WASM environment
        const result = await extractTextWithPlumber(pdfFile);
        text = result.text;
        boxes = result.boundingBoxes || [];
      } else if (selectedTool === "ocr") {
        // Placeholder function for OCR with Tesseract or other service
        const ocrResult = await extractTextWithOCR(pdfFile);
        text = ocrResult.text;
        boxes = ocrResult.boundingBoxes || [];
      } else {
        // "default" means just use pdf.js's getTextContent
        // This snippet is already part of your original code
        // but you might move it into a utility function
        text = await getPdfjsExtractedText(pdfFile);
        // no bounding boxes in default approach
      }

      setExtractedText(text);
      setBoundingBoxes(boxes);
    } catch (err) {
      console.error("Error extracting text:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Example helper function for "default" extraction using pdf.js
  const getPdfjsExtractedText = async (fileUrl: string) => {
    const loadingTask = pdfjs.getDocument(fileUrl);
    const pdf = await loadingTask.promise;
    let combinedText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      combinedText += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return combinedText;
  };

  // Create chunks from extractedText or boundingBoxes
  const handleChunkify = () => {
    if (!extractedText) {
      console.warn("No text to chunkify.");
      return;
    }
    // Example chunking using tiktoken logic (placeholder)
    const newChunks = chunkText(extractedText, chunkSize);
    setChunks(newChunks);
  };

  // Run a single prompt iteratively on each chunk
  const handleRunPrompt = async () => {
    if (!chunks.length || !promptInput) return;
    // Clear old results
    setPromptResults([]);
    setIsLoading(true);

    // Example "fake" prompt logic
    // In reality you'd call your GPT-based or LLM-based API
    // and store each chunk's result in state
    const results: string[] = [];
    for (const chunk of chunks) {
      const response = await dummySendPrompt(promptInput, chunk);
      results.push(response);
    }
    setPromptResults(results);
    setIsLoading(false);
  };

  // Example function to represent calling an LLM
  const dummySendPrompt = async (prompt: string, chunk: string) => {
    // simulate network call
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        // silly example
        resolve(`Prompt: "${prompt}" on chunk: "${chunk.slice(0, 50)}..." => done`);
      }, 500);
    });
  };

  const zoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3.0)); // Max zoom: 3x
  const zoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5)); // Min zoom: 0.5x


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
                onExtract={handleExtract}
                onChunkify={handleChunkify}
                isLoading={isLoading}
              />

              {selectedTool === "ocr" && (
              <div className="bg-gray-700 p-4 rounded mt-4">
                <h3 className="text-sm font-bold text-blue-400 mb-2">OCR Controls</h3>
                <div className="flex items-center gap-4">
                  <span className="text-gray-200 text-sm">Process All Pages</span>
                  <Switch
                    label="" // Add a label prop
                    checked={processAllPages}
                    onChange={() => setProcessAllPages(!processAllPages)}
                  />
                  <button
                  onClick={handleOCRProcessing}
                  className="mt-4 px-4 py-2 bg-blue-500 rounded text-sm disabled:bg-gray-500"
                  disabled={ocrLoading || !pdfFile}
                >
                {ocrLoading ? "Processing..." : "Go"}
                </button>
                </div>

                {/* Make Rounding Boxes */}
                <div className="mt-6">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-200 text-sm">Make Rounding Boxes</span>
                    <Switch
                      label=""
                      checked={boundingBoxPages} // This can use a separate state if needed
                      onChange={() => setBoundingBoxPages(!boundingBoxPages)}
                    />
                    <button
                      onClick={handleBoundingBox}
                      className="mt-4 px-4 py-2 bg-green-500 rounded text-sm disabled:bg-gray-500"
                      disabled={ocrLoading || !pdfFile}
                    >
                      {ocrLoading ? "Processing..." : "Go"}
                    </button>
                  </div>
                </div>
                {/* <div className="mt-4 flex items-center gap-2">
                  <span className="text-gray-200 text-sm">Adjust Sensitivity</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    className="slider w-full"
                  />
                </div> */}
                
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
            <div className="flex items-center gap-2">
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
                        // Match canvas to PDF dimensions after page render
                        const canvas = document.getElementById("canvasId") as HTMLCanvasElement;
                        if (canvas) {
                          const viewport = page.getViewport({ scale: zoomLevel });
                          canvas.width = viewport.width;
                          canvas.height = viewport.height;
                          canvas.style.width = `${viewport.width}px`;
                          canvas.style.height = `${viewport.height}px`;
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
                      pointerEvents: "none", // Prevent interactions
                      zIndex: 2, // Ensure the canvas is above the PDF
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

          {/* Chunk List & Prompt Results */}
          <ChunkList
            chunks={chunks}
            promptResults={promptResults}
          />
        </div>
      </Split>
    </div>
  );
};

export default PdfAnnotationTool