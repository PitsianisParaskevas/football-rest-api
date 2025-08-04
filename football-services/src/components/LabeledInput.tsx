import "./LabeledInput.css";

type LabeledInputProps = {
  title: string;
  value: string;
  onChange: (newValue: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  type?: string;
  buttonText?: string;
};

const LabeledInput = ({
  title,
  value,
  onChange,
  onSubmit,
  placeholder = "",
  type = "text",
  buttonText = "Fetch Data",
}: LabeledInputProps) => {
  return (
    <div className="labeled-input">
      <label className="labeled-input-label">{title}</label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="labeled-input-field"
        />
        <button onClick={onSubmit} className="input-button">
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default LabeledInput;
