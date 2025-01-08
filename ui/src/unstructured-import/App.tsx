import React, { useState, useEffect } from "react";
import Split from "react-split";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css"; // Text layer styles
import { Switch } from "../components/switch";
import {
  saveCypherResult,
  saveImportResultAsNeo4jImport,
} from "./utils/file-utils";
import { runImport } from "./utils/fetch-utils";

const HAS_API_KEY_URI =
  import.meta.env.VITE_HAS_API_KEY_ENDPOINT ??
  "http://localhost:7860/hasapikey";

function loadKeyFromStorage() {
  return localStorage.getItem("api_key");
}


// Dynamically import PDF.js and its worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const SplitPanelLayout: React.FC = () => {
  const [serverAvailable, setServerAvailable] = useState(true);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [useSchema, setUseSchema] = useState(false);
  const [needsApiKey, setNeedsApiKey] = useState(true);
  const [needsApiKeyLoading, setNeedsApiKeyLoading] = useState(true);
  const [schema, setSchema] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [summaryResult, setSummaryResult] = useState<any | null>(null);
  const [viewText, setViewText] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [apiKey, setApiKey] = useState(loadKeyFromStorage() || "");

  useEffect(() => {
    fetch(HAS_API_KEY_URI).then(
      (response) => {
        response.json().then(
          (result) => {
            // const needsKey = result.output;
            const needsKey = !result.output;
            setNeedsApiKey(needsKey);
            setNeedsApiKeyLoading(false);
            if (needsKey) {
              const api_key = loadKeyFromStorage();
              if (api_key) {
                setApiKey(api_key);
              } else {
                alert("API key has been set successfully.");
              }
            }
          },
          (error) => {
            setNeedsApiKeyLoading(false);
            setServerAvailable(false);
          }
        );
      },
      (error) => {
        setNeedsApiKeyLoading(false);
        setServerAvailable(false);
      }
    );
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPdfFile(URL.createObjectURL(file));
      extractTextFromPDF(file);
    }
  };

  const extractTextFromPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    setExtractedText(text);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (currentPage < (numPages || 0)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setResult(null);

    const file = document.querySelector(".file-input") as HTMLInputElement;
    if (!file.files || !file.files[0]) {
      console.error("No file selected");
      setLoading(false);
      return;
    }

    try {
      // The handle Import function sends the entire extracted text to the endpoint in one
      const textContent = extractedText;
      const schemaJson = useSchema ? JSON.parse(schema) : undefined;

      // Format payload to match the legacy structure
      const payload = {
        input: textContent,
        neo4j_schema: schemaJson, // Include schema if applicable
      };

      console.log("Structured payload:", JSON.stringify(payload, null, 2));

      // Send structured payload to the import function
        const importResult = await runImport(
          payload.input,
          payload.neo4j_schema,
          needsApiKey ? apiKey : undefined
        );


      console.log("Import result:", importResult);
        if (importResult) {
          setResult(importResult);
        }


    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPatent = async () => {
    setLoading(true);
    setResult(null);
  
    try {
      const file = document.querySelector(".file-input") as HTMLInputElement;
      if (!file.files || !file.files[0]) {
        console.error("No file selected");
        setLoading(false);
        return;
      }
  
      const textContent = extractedText;
      const schemaJson = useSchema ? JSON.parse(schema) : undefined;
  
      const payload = {
        input: textContent, // Sending textContent as input
        api_key: "dummy_api_key", // Add the required dummy API key
      };
  
      console.log("Sending payload to /api/make_product_report:", payload);
  
      const response = await fetch(
        `${import.meta.env.VITE_UNSTRUCTURED_IMPORT_BACKEND_ENDPOINT}/api/make_product_report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
  
      if (!response.ok) {
        throw new Error(`Failed to load patent: ${response.statusText}`);
      }
  
      const result = await response.json();
      setResult(result);
      console.log("Load Patent result:", result);
    } catch (error) {
      console.error("Error in handleLoadPatent:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDocumentSummary = async () => {
    setSummaryLoading(true);
    setSummaryResult(null);
  
    try {
      const file = document.querySelector(".file-input") as HTMLInputElement;
      if (!file.files || !file.files[0]) {
        console.error("No file selected");
        setSummaryLoading(false);
        return;
      }
  
      const textContent = extractedText;
      const schemaJson = useSchema ? JSON.parse(schema) : undefined;
  
      const payload = {
        input: textContent, // Sending textContent as input
        api_key: "dummy_api_key", // Add the required dummy API key
      };
  
      console.log("Sending payload to /api/detail_document_summary:", payload);
  
      const response = await fetch(
        `${import.meta.env.VITE_UNSTRUCTURED_IMPORT_BACKEND_ENDPOINT}/api/detail_document_summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
  
      if (!response.ok) {
        throw new Error(`Failed to load patent: ${response.statusText}`);
      }
  
      const result = await response.json();
      setSummaryResult(result);
      console.log("Load Patent result:", result);
    } catch (error) {
      console.error("Error in handleLoadPatent:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleLoadRealWorldData = async () => {
    setDataLoading(true);
    // setResult(null);
  
    try {
  
      const textContent = "Request to Load data sent"
  
      const payload = {
        input: textContent, // Sending textContent as input
        api_key: "dummy_api_key", // Add the required dummy API key
      };
  
      console.log("Sending payload to /api/load_product_data:", payload);
  
      const response = await fetch(
        `${import.meta.env.VITE_UNSTRUCTURED_IMPORT_BACKEND_ENDPOINT}/api/load_product_data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
  
      if (!response.ok) {
        throw new Error(`Failed to load patent: ${response.statusText}`);
      }
  
      const result = await response.json();
      setResult(result);
      console.log("Load Patent result:", result);
    } catch (error) {
      console.error("Error in handleLoadPatent:", error);
    } finally {
      setLoading(false);
    }
  };
  


  return (
    <div className="h-screen bg-gray-900 text-white">
      <Split
        className="flex h-full"
        sizes={[50, 50]}
        minSize={300}
        gutterSize={10}
        gutterAlign="center"
        snapOffset={30}
        dragInterval={1}
      >
        {/* Left Panel: PDF Viewer / Text Viewer */}
        <div className="bg-gray-800 p-4 shadow-lg rounded-md flex flex-col gap-4 relative">
          <div className="flex justify-between items-center gap-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="file-input block w-1/2 text-sm text-gray-200 border border-gray-600 rounded-lg cursor-pointer bg-gray-700 focus:outline-none"
            />


            <button
              onClick={() => setViewText(!viewText)}
              className="bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600"
            >
              {viewText ? "View PDF" : "View Text"}
            </button>

          </div>

          {viewText ? (
            <div className="overflow-auto p-4 bg-gray-900 rounded-md border border-gray-600">
              <pre className="text-sm whitespace-pre-wrap text-gray-300">
                {extractedText || "No text extracted yet."}
              </pre>
            </div>
          ) : (
            pdfFile && (
              <>
                <div className="flex justify-between items-center my-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="bg-blue-500 text-white px-3 py-2 rounded-lg disabled:bg-gray-400"
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentPage} of {numPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === numPages}
                    className="bg-blue-500 text-white px-3 py-2 rounded-lg disabled:bg-gray-400"
                  >
                    Next
                  </button>
                </div>
                <Document file={pdfFile} onLoadSuccess={onDocumentLoadSuccess} className="overflow-auto">
                  <Page pageNumber={currentPage} />
                </Document>
              </>
            )
          )}

          {!pdfFile && !viewText && <p>Please upload a PDF to view.</p>}
        </div>

        {/* Right Panel: Code Content */}
        <div className="bg-gray-800 p-4 shadow-lg rounded-md overflow-auto">
          <h1 className="text-2xl font-bold text-center mb-4 text-blue-400">
            Import my data into the component
          </h1>
          <p className="mb-2 text-gray-300">
            This tool is used to import unstructured data into Neo4j. It takes a file as input and optionally a
            schema in the form of
            <a
              href="https://neo4j.com/developer-blog/describing-property-graph-data-model/"
              className="text-blue-500 underline"
            >
              graph data model
            </a>
            which is used to limit the data that is extracted from the file.
          </p>
          <ul className="list-disc list-inside mb-4 text-gray-300">
            <li>A cypher script that you can run in Neo4j Browser</li>
            <li>A file that you can import using the Neo4j Import Tool</li>
          </ul>

          <Switch
            label="Use schema"
            checked={useSchema}
            onChange={() => setUseSchema(!useSchema)}
          />
          {useSchema && (
            <textarea
              className="mt-2 block w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-200"
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              placeholder="Provide schema in JSON format"
            />
          )}

          <button
            onClick={handleLoadRealWorldData}
            disabled={dataLoading}
            className={`mt-4 w-full px-4 py-2 rounded-lg text-white ${
              dataLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {loading ? "Loading..." : "Load Real World Product Data"}
          </button>

          <button
          onClick={handleLoadPatent}
          disabled={loading}
          className={`mt-2 w-full px-4 py-2 rounded-lg text-white ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {loading ? "Loading Patent..." : "Load Patent"}
        </button>

        <button
          onClick={handleDocumentSummary}
          disabled={summaryLoading}
          className={`mt-2 w-full px-4 py-2 rounded-lg text-white ${
            summaryLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {summaryLoading ? "Summarizing Document..." : "Summarize Document"}
        </button>


          {result && (
            <div className="mt-4 bg-green-50 border border-green-300 p-4 rounded-lg text-gray-900">
              <h2 className="text-xl font-bold text-green-600">Result</h2>
              <p className="mb-2">
                The import was successful. You can save the result as a cypher.
              </p>
              <button
                onClick={() => saveCypherResult(result)}
                className="mr-2 bg-blue-500 text-white px-4 py-2 rounded-lg"
              >
                Save as Cypher
              </button>
              <button
                onClick={() => saveImportResultAsNeo4jImport(result)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg"
              >
                Save as Neo4j Import format
              </button>
              </div>
              )}
        </div>
    </Split>
    </div>
  );
};

export default SplitPanelLayout;