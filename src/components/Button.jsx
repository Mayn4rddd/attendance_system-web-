const variantStyles = {
  primary: "bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 border border-slate-200",
  danger: "bg-rose-100 text-rose-700 hover:bg-rose-200 active:bg-rose-300 border border-rose-200",
  info: "bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300 border border-blue-200",
  outline: "bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-slate-300",
};

const Button = ({ variant = "primary", className = "", disabled = false, children, ...props }) => {
  const baseStyle = variantStyles[variant] ?? variantStyles.primary;

  const disabledStyle = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      className={`inline-flex items-center justify-center h-10 px-4 py-0 rounded-lg text-sm font-semibold leading-5 whitespace-nowrap transition duration-150 ease-in-out ${baseStyle} ${disabledStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;