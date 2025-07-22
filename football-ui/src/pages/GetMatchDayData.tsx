// src/pages/GetMatchDayData.tsx
import { useState } from "react";
import LabeledInput from "../components/LabeledInput";

const GetMatchDayData = () => {
  const [date, setDate] = useState("");

  return (
    <div>
      <h2>📅 Get Match Day Data</h2>
      <LabeledInput
        title="Select Match Date"
        type="date"
        value={date}
        onChange={setDate}
      />
    </div>
  );
};

export default GetMatchDayData;
