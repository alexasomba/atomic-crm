import { expect, it } from "vite-plus/test";
import { render } from "vitest-browser-react";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "./questionnaire";

it("navigates through questions and submits selected answers", async () => {
  let submitted = "";
  const screen = await render(
    <Questionnaire
      items={[{ name: "goal" }, { name: "context" }]}
      onSubmit={(event) => {
        event.preventDefault();
        submitted = String(new FormData(event.currentTarget).get("context"));
      }}
    >
      <QuestionnaireProgress />
      <QuestionnaireItem name="goal">
        <QuestionnaireTitle>Goal</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="follow-up">Follow up</QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>
      <QuestionnaireItem name="context">
        <QuestionnaireTitle>Context</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="deals">Deals</QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnaireNext />
        <QuestionnaireSubmit />
      </QuestionnaireActions>
    </Questionnaire>,
  );

  await (expect as any)
    .element(screen.getByText("Question 1 of 2"))
    .toBeVisible();
  await screen.getByLabelText("Follow up").click();
  await screen.getByRole("button", { name: "Next" }).click();
  await (expect as any)
    .element(screen.getByText("Question 2 of 2"))
    .toBeVisible();
  await screen.getByLabelText("Deals").click();
  await screen.getByRole("button", { name: "Submit" }).click();
  expect(submitted).toBe("deals");
});
