import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./ToastRegion";

function CopyAction() {
  const { notify } = useToast();
  return (
    <button onClick={() => notify("已复制结果")} type="button">
      复制
    </button>
  );
}

it("announces transient action feedback from a shared live region", async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <CopyAction />
    </ToastProvider>,
  );

  await user.click(screen.getByRole("button", { name: "复制" }));

  const status = screen.getByRole("status");
  expect(status).toHaveAttribute("aria-live", "polite");
  expect(status).toHaveTextContent("已复制结果");
});
