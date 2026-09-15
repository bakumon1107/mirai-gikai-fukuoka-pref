// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { MakePublicModal } from "./make-public-modal";

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("MakePublicModal", () => {
  it("政党名を前提とした「党内」という表現を含まない", () => {
    render(
      <MakePublicModal
        open={true}
        onOpenChange={() => {}}
        onConfirm={() => {}}
        isSubmitting={false}
      />
    );

    expect(screen.queryByText(/党内/)).not.toBeInTheDocument();
  });

  it("政策検討の文言が余分な空白なく連結されて表示される", () => {
    render(
      <MakePublicModal
        open={true}
        onOpenChange={() => {}}
        onConfirm={() => {}}
        isSubmitting={false}
      />
    );

    expect(
      screen.getByText(
        "非公開で提出した場合でも、ご意見は政策検討に活用させていただきます。"
      )
    ).toBeInTheDocument();
  });
});
