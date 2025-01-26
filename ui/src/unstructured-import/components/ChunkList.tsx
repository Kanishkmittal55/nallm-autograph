import React from "react";

interface ChunkListProps {
  chunks: string[];
  promptResults: string[];
}

export const ChunkList: React.FC<ChunkListProps> = ({ chunks, promptResults }) => {
  return (
    <div className="flex-1 overflow-auto border border-gray-700 p-2 rounded">
      <h2 className="text-xl font-bold mb-2 text-blue-300">Chunks</h2>
      {chunks.length === 0 ? (
        <p>No chunks yet.</p>
      ) : (
        chunks.map((chunk, idx) => (
          <div key={idx} className="mb-4 border-b border-gray-600 pb-2">
            <p className="text-sm mb-1 text-yellow-300">Chunk {idx + 1}:</p>
            <pre className="text-xs whitespace-pre-wrap text-gray-200">
              {chunk}
            </pre>
            {promptResults[idx] && (
              <div className="mt-1 bg-gray-700 p-2 rounded">
                <p className="text-green-400">Prompt Result:</p>
                <pre className="text-gray-200 text-xs whitespace-pre-wrap">
                  {promptResults[idx]}
                </pre>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
