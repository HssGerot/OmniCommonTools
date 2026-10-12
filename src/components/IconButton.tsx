import type {
  ButtonHTMLAttributes,
  PropsWithChildren,
} from "react";

type IconButtonProps = PropsWithChildren<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
    label: string;
  }
>;

export function IconButton({
  children,
  className,
  label,
  type = "button",
  ...buttonProps
}: IconButtonProps) {
  const classes = ["icon-button", className].filter(Boolean).join(" ");

  return (
    <button
      {...buttonProps}
      aria-label={label}
      className={classes}
      title={label}
      type={type}
    >
      {children}
    </button>
  );
}
