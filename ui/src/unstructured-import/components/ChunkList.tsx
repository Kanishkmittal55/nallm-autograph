import React from "react";

interface ChunkListProps {
  chunks: string[];
  promptResults: string[];
  // NEW: optional callbacks for delete & merge
  onDelete?: (index: number) => void;
  onMerge?: (index: number) => void;
  selectedMergeIndex?: number | null;
}

export const ChunkList: React.FC<ChunkListProps> = ({
  chunks,
  promptResults,
  onDelete,
  onMerge,
  selectedMergeIndex
}) => {
  return (
    <div className="flex-1 overflow-auto border border-gray-700 p-2 rounded">
      <h2 className="text-xl font-bold mb-2 text-blue-300">Chunks</h2>
      {chunks.length === 0 ? (
        <p>No chunks yet.</p>
      ) : (
        chunks.map((chunk, idx) => (
          <div
            key={idx}
            className="mb-4 border-b border-gray-600 pb-2 relative"
            style={{
              backgroundColor:
                selectedMergeIndex === idx ? "rgba(0,255,0,0.2)" : "transparent"
            }}
          >
            <p className="text-sm mb-1 text-yellow-300">Chunk {idx + 1}:</p>
            <pre className="text-xs whitespace-pre-wrap text-gray-200">
              {chunk}
            </pre>

            {/* If there's a matching prompt result for this chunk, show it */}
            {promptResults[idx] && (
              <div className="mt-1 bg-gray-700 p-2 rounded">
                <p className="text-green-400">Prompt Result:</p>
                <pre className="text-gray-200 text-xs whitespace-pre-wrap">
                  {promptResults[idx]}
                </pre>
              </div>
            )}

            {/* Buttons row */}
            <div className="flex gap-2 mt-2">
              {onDelete && (
                <button
                  onClick={() => onDelete(idx)}
                  className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                >
                  Delete
                </button>
              )}
              {onMerge && (
                <button
                  onClick={() => onMerge(idx)}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                >
                  Merge
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
