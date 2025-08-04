import React from "react";
import "./ResultCodeSection.css";

interface ResultCodeSectionProps {
  title: string;
  data: any;
}

const ResultCodeSection: React.FC<ResultCodeSectionProps> = ({
  title,
  data,
}) => {
  const jsonText = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      alert("✅ Copied to clipboard");
    } catch (err) {
      console.error("Copy failed:", err);
      alert("❌ Failed to copy");
    }
  };

  return (
    <div className="section-code">
      <div className="section-header">
        <h3 className="section-title">{title}</h3>
        <button className="copy-button" onClick={handleCopy}>
          📋 Copy
        </button>
      </div>
      <pre className="code-block">{jsonText}</pre>
    </div>
  );
};

export default ResultCodeSection;
