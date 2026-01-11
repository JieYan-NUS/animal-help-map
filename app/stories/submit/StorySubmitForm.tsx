"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitStory, type StoryFormState } from "./actions";
import { t, type Locale } from "@/lib/i18n";
import {
  DEFAULT_STORY_CATEGORY,
  STORY_CATEGORIES,
  isGalleryStoryCategory,
  type StoryCategory
} from "@/lib/storyCategories";

const initialState: StoryFormState = { status: "idle" };
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

const animalOptions = [
  { value: "cat", labelKey: "stories.form.animalOptions.cat" },
  { value: "dog", labelKey: "stories.form.animalOptions.dog" },
  { value: "bird", labelKey: "stories.form.animalOptions.bird" },
  { value: "other", labelKey: "stories.form.animalOptions.other" }
];

const categoryOptions = STORY_CATEGORIES.map((category) => ({
  value: category.id,
  labelKey: category.labelKey
}));

const extraPhotoFields = [
  "photo_3",
  "photo_4",
  "photo_5",
  "photo_6",
  "photo_7",
  "photo_8",
  "photo_9",
  "photo_10"
] as const;

const validateFile = (locale: Locale, file: File | null): string | null => {
  if (!file) return null;
  const isAllowedType =
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    /[.]?(jpe?g|png|webp)$/i.test(file.name);
  if (!isAllowedType) {
    return t(locale, "stories.error.photoType");
  }
  if (file.size > 5 * 1024 * 1024) {
    return t(locale, "stories.error.photoSize");
  }
  return null;
};

function SubmitButton({
  locale,
  disabled
}: {
  locale: Locale;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button className="button" type="submit" disabled={isDisabled}>
      {pending ? t(locale, "stories.submitting") : t(locale, "stories.submitButton")}
    </button>
  );
}

export default function StorySubmitForm({ locale }: { locale: Locale }) {
  const [state, formAction] = useFormState(submitStory, initialState);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isUploadTooLarge, setIsUploadTooLarge] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [category, setCategory] = useState<StoryCategory>(
    DEFAULT_STORY_CATEGORY
  );
  const isMultiPhotoCategory = isGalleryStoryCategory(category);
  const isAnimalTypeHidden =
    category === "community_moments" || category === "this_is_pawscue";
  const isAnimalTypeRequired = category === "rescue" || category === "lost_found";
  const isImageRequired = category === "rescue" || category === "lost_found";
  const isCommunity = category === "community_moments";
  const status = state?.status ?? "idle";
  const stateMessage = state?.message;
  const fieldErrors = state?.fieldErrors ?? {};

  useEffect(() => {
    if (status === "success") {
      formRef.current?.reset();
      setClientError(null);
      setIsUploadTooLarge(false);
      setCategory(DEFAULT_STORY_CATEGORY);
    }
  }, [status]);

  const getTotalBytes = useCallback((form: HTMLFormElement | null) => {
    if (!form) return 0;
    const inputs = Array.from(
      form.querySelectorAll<HTMLInputElement>("input[type='file']")
    );
    return inputs.reduce((total, input) => {
      const file = input.files?.[0];
      return file ? total + file.size : total;
    }, 0);
  }, []);

  const updateTotalBytes = useCallback(
    (form: HTMLFormElement | null) => {
      const total = getTotalBytes(form);
      setIsUploadTooLarge(total > MAX_TOTAL_BYTES);
    },
    [getTotalBytes]
  );

  useEffect(() => {
    updateTotalBytes(formRef.current);
  }, [category, updateTotalBytes]);

  const handleFileChange = () => {
    updateTotalBytes(formRef.current);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setClientError(null);
    const form = event.currentTarget;
    form
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input[type='text'], textarea"
      )
      .forEach((field) => {
        field.value = field.value.trim();
      });
    const formData = new FormData(form);
    const excerpt = String(formData.get("excerpt") ?? "").trim();
    const consent = formData.get("consent");

    if (excerpt.length > 140) {
      event.preventDefault();
      setClientError(t(locale, "stories.error.excerptTooLong"));
      return;
    }

    if (!consent) {
      event.preventDefault();
      setClientError(t(locale, "stories.error.consentRequired"));
      return;
    }

    const totalSelectedBytes = getTotalBytes(form);
    if (totalSelectedBytes > MAX_TOTAL_BYTES) {
      event.preventDefault();
      setIsUploadTooLarge(true);
      return;
    }

    const beforeInput = form.elements.namedItem(
      "before_photo"
    ) as HTMLInputElement | null;
    const afterInput = form.elements.namedItem(
      "after_photo"
    ) as HTMLInputElement | null;
    const extraInputs = isMultiPhotoCategory
      ? extraPhotoFields.map(
          (name) =>
            form.elements.namedItem(name) as HTMLInputElement | null
        )
      : [];
    const beforeFile = beforeInput?.files?.[0] ?? null;
    const afterFile = afterInput?.files?.[0] ?? null;
    const extraFiles = extraInputs
      .map((input) => input?.files?.[0] ?? null)
      .filter((file): file is File => Boolean(file));

    if (!beforeFile && isImageRequired) {
      event.preventDefault();
      setClientError(t(locale, "stories.error.beforePhotoRequired"));
      return;
    }

    const filesToValidate = [beforeFile, afterFile, ...extraFiles];
    for (const file of filesToValidate) {
      if (!file) continue;
      const fileError = validateFile(locale, file);
      if (fileError) {
        event.preventDefault();
        setClientError(fileError);
        return;
      }
    }
  };

  return (
    <form
      ref={formRef}
      className="form"
      action={async (formData) => {
        try {
          await formAction(formData);
        } catch (error) {
          const message = String(
            (error as { message?: string })?.message ?? error ?? ""
          );
          const isPayloadTooLarge = /413|Payload Too Large/i.test(message);
          console.error("Story submit failed:", error);
          setClientError(
            isPayloadTooLarge
              ? t(locale, "stories.upload.error_too_large")
              : t(locale, "stories.upload.error_generic")
          );
        }
      }}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="locale" value={locale} />
      {status === "success" && stateMessage ? (
        <p className="success" role="status">
          {stateMessage}
        </p>
      ) : null}
      {status === "error" && stateMessage ? (
        <p className="error" role="alert">
          {/413|Payload Too Large/i.test(stateMessage)
            ? t(locale, "stories.upload.error_too_large")
            : stateMessage}
        </p>
      ) : null}
      {clientError ? (
        <p className="error" role="alert">
          {clientError}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="title">{t(locale, "stories.form.title.label")}</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={
            fieldErrors.title ? "title-error" : undefined
          }
        />
        {fieldErrors.title ? (
          <p className="error" id="title-error">
            {fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="category">{t(locale, "stories.form.category.label")}</label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value as StoryCategory)}
        >
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {t(locale, option.labelKey)}
            </option>
          ))}
        </select>
        {isCommunity ? (
          <p className="helper">
            {t(locale, "stories.form.category.helper.community")}
          </p>
        ) : null}
      </div>

      {isAnimalTypeHidden ? null : (
        <div className="field">
          <label htmlFor="animal_type">
            {t(
              locale,
              isAnimalTypeRequired
                ? "stories.form.animalType.label"
                : "stories.form.animalType.optionalLabel"
            )}
          </label>
          <select
            id="animal_type"
            name="animal_type"
            required={isAnimalTypeRequired}
            aria-invalid={Boolean(fieldErrors.animal_type)}
            aria-describedby={
              fieldErrors.animal_type ? "animal-type-error" : undefined
            }
            defaultValue=""
          >
            <option value="" disabled>
              {t(locale, "stories.form.animalType.placeholder")}
            </option>
            {animalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(locale, option.labelKey)}
              </option>
            ))}
          </select>
          {fieldErrors.animal_type ? (
            <p className="error" id="animal-type-error">
              {fieldErrors.animal_type}
            </p>
          ) : null}
        </div>
      )}
      {isAnimalTypeHidden ? (
        <input type="hidden" name="animal_type" value="other" />
      ) : null}

      <div className="field">
        <label htmlFor="city">{t(locale, "stories.form.city.label")}</label>
        <input
          id="city"
          name="city"
          type="text"
          required
          aria-invalid={Boolean(fieldErrors.city)}
          aria-describedby={fieldErrors.city ? "city-error" : undefined}
        />
        {fieldErrors.city ? (
          <p className="error" id="city-error">
            {fieldErrors.city}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="month_year">{t(locale, "stories.form.monthYear.label")}</label>
        <input
          id="month_year"
          name="month_year"
          type="text"
          placeholder={t(locale, "stories.form.monthYear.placeholder")}
          required
          aria-invalid={Boolean(fieldErrors.month_year)}
          aria-describedby={
            fieldErrors.month_year ? "month-year-error" : undefined
          }
        />
        {fieldErrors.month_year ? (
          <p className="error" id="month-year-error">
            {fieldErrors.month_year}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="excerpt">{t(locale, "stories.form.excerpt.label")}</label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={3}
          maxLength={140}
          required
          aria-invalid={Boolean(fieldErrors.excerpt)}
          aria-describedby={
            fieldErrors.excerpt ? "excerpt-error" : undefined
          }
        />
        {fieldErrors.excerpt ? (
          <p className="error" id="excerpt-error">
            {fieldErrors.excerpt}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="content">{t(locale, "stories.form.content.label")}</label>
        <textarea
          id="content"
          name="content"
          rows={7}
          required
          aria-invalid={Boolean(fieldErrors.content)}
          aria-describedby={
            fieldErrors.content ? "content-error" : undefined
          }
        />
        {fieldErrors.content ? (
          <p className="error" id="content-error">
            {fieldErrors.content}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="author_name">{t(locale, "stories.form.authorName.label")}</label>
        <input id="author_name" name="author_name" type="text" />
      </div>

      <div className="field">
        <label htmlFor="author_contact">{t(locale, "stories.form.authorContact.label")}</label>
        <input id="author_contact" name="author_contact" type="text" />
      </div>

      {isMultiPhotoCategory ? (
        <div className="field">
          <label>{t(locale, "stories.form.photos.optionalLabel")}</label>
          <p className="helper">{t(locale, "stories.form.photos.helper")}</p>
          <p className="helper">{t(locale, "stories.upload.limit10")}</p>
          <div className="photo-inputs">
            {[
              { id: "before_photo", name: "before_photo" },
              { id: "after_photo", name: "after_photo" },
              ...extraPhotoFields.map((name) => ({ id: name, name }))
            ].map((photoInput, index) => (
              <input
                key={photoInput.id}
                id={photoInput.id}
                name={photoInput.name}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                aria-label={`${t(locale, "stories.form.photos.slotLabel")} ${
                  index + 1
                }`}
                aria-invalid={
                  photoInput.name === "before_photo"
                    ? Boolean(fieldErrors.before_photo)
                    : photoInput.name === "after_photo"
                      ? Boolean(fieldErrors.after_photo)
                      : undefined
                }
              />
            ))}
          </div>
          {fieldErrors.before_photo ? (
            <p className="error" id="before-photo-error">
              {fieldErrors.before_photo}
            </p>
          ) : null}
          {fieldErrors.after_photo ? (
            <p className="error" id="after-photo-error">
              {fieldErrors.after_photo}
            </p>
          ) : null}
          {isUploadTooLarge ? (
            <p className="error" role="alert">
              <strong>{t(locale, "stories.upload.limit_title")}</strong>{" "}
              {t(locale, "stories.upload.limit_body")}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="before_photo">
              {t(
                locale,
                isImageRequired
                  ? "stories.form.beforePhoto.label"
                  : "stories.form.beforePhoto.optionalLabel"
              )}
            </label>
            <p className="helper">{t(locale, "stories.form.photo.helper")}</p>
            <input
              id="before_photo"
              name="before_photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={isImageRequired}
              onChange={handleFileChange}
              aria-invalid={Boolean(fieldErrors.before_photo)}
              aria-describedby={
                fieldErrors.before_photo ? "before-photo-error" : undefined
              }
            />
            {fieldErrors.before_photo ? (
              <p className="error" id="before-photo-error">
                {fieldErrors.before_photo}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="after_photo">
              {t(locale, "stories.form.afterPhoto.label")}
            </label>
            <p className="helper">{t(locale, "stories.form.photo.helper")}</p>
            <input
              id="after_photo"
              name="after_photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              aria-invalid={Boolean(fieldErrors.after_photo)}
              aria-describedby={
                fieldErrors.after_photo ? "after-photo-error" : undefined
              }
            />
            {fieldErrors.after_photo ? (
              <p className="error" id="after-photo-error">
                {fieldErrors.after_photo}
              </p>
            ) : null}
          </div>
          {isUploadTooLarge ? (
            <p className="error" role="alert">
              <strong>{t(locale, "stories.upload.limit_title")}</strong>{" "}
              {t(locale, "stories.upload.limit_body")}
            </p>
          ) : null}
        </>
      )}

      <div className="field">
        <label className="checkbox">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            aria-invalid={Boolean(fieldErrors.consent)}
            aria-describedby={
              fieldErrors.consent ? "consent-error" : undefined
            }
          />{" "}
          {t(locale, "stories.form.consent.label")}
        </label>
        {fieldErrors.consent ? (
          <p className="error" id="consent-error">
            {fieldErrors.consent}
          </p>
        ) : null}
      </div>

      {isUploadTooLarge ? (
        <p className="error" role="alert">
          <strong>{t(locale, "stories.upload.limit_title")}</strong>{" "}
          {t(locale, "stories.upload.limit_body")}
        </p>
      ) : null}

      <SubmitButton locale={locale} disabled={isUploadTooLarge} />
    </form>
  );
}
