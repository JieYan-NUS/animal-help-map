"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitStory, type StoryFormState } from "./actions";

const initialState: StoryFormState = { status: "idle" };

const animalOptions = [
  { value: "cat", label: "Cat" },
  { value: "dog", label: "Dog" },
  { value: "bird", label: "Bird" },
  { value: "other", label: "Other" }
];

const validateFile = (file: File | null, label: string): string | null => {
  if (!file) return null;
  const isAllowedType =
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    /[.]?(jpe?g|png|webp)$/i.test(file.name);
  if (!isAllowedType) {
    return `Only JPG, PNG, or WebP images are allowed for the ${label.toLowerCase()}.`;
  }
  if (file.size > 5 * 1024 * 1024) {
    return `${label} must be 5MB or smaller.`;
  }
  return null;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Submitting..." : "Submit story"}
    </button>
  );
}

export default function StorySubmitForm() {
  const [state, formAction] = useFormState(submitStory, initialState);
  const [clientError, setClientError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setClientError(null);
    }
  }, [state.status]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setClientError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const excerpt = String(formData.get("excerpt") ?? "").trim();
    const consent = formData.get("consent");

    if (excerpt.length > 140) {
      event.preventDefault();
      setClientError("Excerpt must be 140 characters or less.");
      return;
    }

    if (!consent) {
      event.preventDefault();
      setClientError("Please confirm the consent checkbox before submitting.");
      return;
    }

    const beforeInput = form.elements.namedItem(
      "before_photo"
    ) as HTMLInputElement;
    const afterInput = form.elements.namedItem(
      "after_photo"
    ) as HTMLInputElement;
    const beforeFile = beforeInput?.files?.[0] ?? null;
    const afterFile = afterInput?.files?.[0] ?? null;

    if (!beforeFile) {
      event.preventDefault();
      setClientError("Please upload a before photo.");
      return;
    }

    const beforeError = validateFile(beforeFile, "Before photo");
    if (beforeError) {
      event.preventDefault();
      setClientError(beforeError);
      return;
    }

    const afterError = validateFile(afterFile, "After photo");
    if (afterError) {
      event.preventDefault();
      setClientError(afterError);
    }
  };

  return (
    <form
      ref={formRef}
      className="form"
      action={formAction}
      onSubmit={handleSubmit}
      encType="multipart/form-data"
    >
      {state.status === "success" && state.message ? (
        <p className="success" role="status">
          {state.message}
        </p>
      ) : null}
      {state.status === "error" && state.message ? (
        <p className="error" role="alert">
          {state.message}
        </p>
      ) : null}
      {clientError ? (
        <p className="error" role="alert">
          {clientError}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="title">Title (required)</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          aria-invalid={Boolean(state.fieldErrors?.title)}
          aria-describedby={
            state.fieldErrors?.title ? "title-error" : undefined
          }
        />
        {state.fieldErrors?.title ? (
          <p className="error" id="title-error">
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="animal_type">Animal type (required)</label>
        <select
          id="animal_type"
          name="animal_type"
          required
          aria-invalid={Boolean(state.fieldErrors?.animal_type)}
          aria-describedby={
            state.fieldErrors?.animal_type ? "animal-type-error" : undefined
          }
          defaultValue=""
        >
          <option value="" disabled>
            Select an animal
          </option>
          {animalOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.animal_type ? (
          <p className="error" id="animal-type-error">
            {state.fieldErrors.animal_type}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="city">City (required)</label>
        <input
          id="city"
          name="city"
          type="text"
          required
          aria-invalid={Boolean(state.fieldErrors?.city)}
          aria-describedby={state.fieldErrors?.city ? "city-error" : undefined}
        />
        {state.fieldErrors?.city ? (
          <p className="error" id="city-error">
            {state.fieldErrors.city}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="month_year">Month and year (required)</label>
        <input
          id="month_year"
          name="month_year"
          type="text"
          placeholder="Jan 2026"
          required
          aria-invalid={Boolean(state.fieldErrors?.month_year)}
          aria-describedby={
            state.fieldErrors?.month_year ? "month-year-error" : undefined
          }
        />
        {state.fieldErrors?.month_year ? (
          <p className="error" id="month-year-error">
            {state.fieldErrors.month_year}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="excerpt">Excerpt (required, max 140 chars)</label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={3}
          maxLength={140}
          required
          aria-invalid={Boolean(state.fieldErrors?.excerpt)}
          aria-describedby={
            state.fieldErrors?.excerpt ? "excerpt-error" : undefined
          }
        />
        {state.fieldErrors?.excerpt ? (
          <p className="error" id="excerpt-error">
            {state.fieldErrors.excerpt}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="content">Story (required)</label>
        <textarea
          id="content"
          name="content"
          rows={7}
          required
          aria-invalid={Boolean(state.fieldErrors?.content)}
          aria-describedby={
            state.fieldErrors?.content ? "content-error" : undefined
          }
        />
        {state.fieldErrors?.content ? (
          <p className="error" id="content-error">
            {state.fieldErrors.content}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="author_name">Your name (optional)</label>
        <input id="author_name" name="author_name" type="text" />
      </div>

      <div className="field">
        <label htmlFor="author_contact">Contact (optional)</label>
        <input id="author_contact" name="author_contact" type="text" />
      </div>

      <div className="field">
        <label htmlFor="before_photo">Before photo (required)</label>
        <p className="helper">JPG, PNG, or WebP. Max 5MB.</p>
        <input
          id="before_photo"
          name="before_photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          aria-invalid={Boolean(state.fieldErrors?.before_photo)}
          aria-describedby={
            state.fieldErrors?.before_photo ? "before-photo-error" : undefined
          }
        />
        {state.fieldErrors?.before_photo ? (
          <p className="error" id="before-photo-error">
            {state.fieldErrors.before_photo}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="after_photo">After photo (optional)</label>
        <p className="helper">JPG, PNG, or WebP. Max 5MB.</p>
        <input
          id="after_photo"
          name="after_photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-invalid={Boolean(state.fieldErrors?.after_photo)}
          aria-describedby={
            state.fieldErrors?.after_photo ? "after-photo-error" : undefined
          }
        />
        {state.fieldErrors?.after_photo ? (
          <p className="error" id="after-photo-error">
            {state.fieldErrors.after_photo}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="checkbox">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            aria-invalid={Boolean(state.fieldErrors?.consent)}
            aria-describedby={
              state.fieldErrors?.consent ? "consent-error" : undefined
            }
          />{" "}
          I own these images and allow Pawscue to display them.
        </label>
        {state.fieldErrors?.consent ? (
          <p className="error" id="consent-error">
            {state.fieldErrors.consent}
          </p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
