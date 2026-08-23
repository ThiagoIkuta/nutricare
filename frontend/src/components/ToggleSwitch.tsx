type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
};

export default function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <>
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className="relative inline-block h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors duration-300 ease-in-out peer-checked:bg-green-500
          after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md
          after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.34,1.56,0.64,1)]
          peer-checked:after:translate-x-5"
      />
    </>
  );
}
