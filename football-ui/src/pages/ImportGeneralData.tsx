// src/pages/ImportGeneralData.tsx
import { useState } from "react";
import LabeledInput from "../components/LabeledInput";

const ImportGeneralData = () => {
  const [url, setUrl] = useState("");

  return (
    <div>
      <h2>📥 Import General Data</h2>
      <LabeledInput
        title="Enter URL to Import Data"
        placeholder="https://..."
        value={url}
        onChange={setUrl}
      />
    </div>
  );
};

export default ImportGeneralData;
