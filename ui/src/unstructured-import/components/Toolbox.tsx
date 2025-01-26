import React from "react";

interface ToolboxProps {
  selectedTool: "pdfplumber" | "ocr" | "default";
  setSelectedTool: (tool: "pdfplumber" | "ocr" | "default") => void;
  chunkSize: number;
  setChunkSize: (size: number) => void;
  onExtract: () => void;
  onChunkify: () => void;
  isLoading: boolean;
}

export const Toolbox: React.FC<ToolboxProps> = ({
  selectedTool,
  setSelectedTool,
  chunkSize,
  setChunkSize,
  onExtract,
  onChunkify,
  isLoading,
}) => {
  return (
    <div className="bg-gray-700 p-2 rounded">
      <h2 className="text-xl font-bold mb-2 text-blue-300">Toolbox</h2>
      {/* Tool selection */}
      <div className="flex flex-col gap-2 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="default"
            checked={selectedTool === "default"}
            onChange={() => setSelectedTool("default")}
          />
          Default (pdf.js Text)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="pdfplumber"
            checked={selectedTool === "pdfplumber"}
            onChange={() => setSelectedTool("pdfplumber")}
          />
          PDFPlumber
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="ocr"
            checked={selectedTool === "ocr"}
            onChange={() => setSelectedTool("ocr")}
          />
          OCR Extraction
        </label>
      </div>

      {/* Chunk Size */}
      <label className="block mb-2">
        <span>Chunk Size:</span>
        <input
          type="number"
          value={chunkSize}
          onChange={(e) => setChunkSize(Number(e.target.value))}
          className="ml-2 w-20 bg-gray-600 border border-gray-500 rounded px-1"
        />
      </label>

      {/* Buttons */}
      <button
        onClick={onExtract}
        disabled={isLoading}
        className={`w-full mb-2 px-4 py-2 rounded ${
          isLoading ? "bg-gray-500" : "bg-green-500 hover:bg-green-600"
        }`}
      >
        {isLoading ? "Extracting..." : "Extract Text"}
      </button>

      <button
        onClick={onChunkify}
        disabled={isLoading}
        className={`w-full px-4 py-2 rounded ${
          isLoading ? "bg-gray-500" : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        Chunkify
      </button>
    </div>
  );
};
