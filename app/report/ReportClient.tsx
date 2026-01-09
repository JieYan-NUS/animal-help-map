"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { cancelLostReport, resolveLostReport, submitReport } from "@/app/report/actions";
import { t, type Locale } from "@/lib/i18n";

const speciesOptions = [
  { value: "Dog", labelKey: "report.options.species.dog" },
  { value: "Cat", labelKey: "report.options.species.cat" },
  { value: "Bird", labelKey: "report.options.species.bird" },
  { value: "Other", labelKey: "report.options.species.other" }
] as const;
const conditionOptions = [
  { value: "Injured", labelKey: "report.options.condition.injured" },
  { value: "Sick", labelKey: "report.options.condition.sick" },
  { value: "Trapped", labelKey: "report.options.condition.trapped" },
  { value: "Stray", labelKey: "report.options.condition.stray" },
  { value: "Nursing", labelKey: "report.options.condition.nursing" },
  { value: "Unknown", labelKey: "report.options.condition.unknown" }
] as const;
const reportTypeOptions = [
  { value: "need_help", labelKey: "report.typeRescue" },
  { value: "lost", labelKey: "report.typeLost" }
] as const;

type ReportData = {
  reportType: "need_help" | "lost";
  species: (typeof speciesOptions)[number]["value"] | "";
  condition: (typeof conditionOptions)[number]["value"] | "";
  description: string;
  locationDescription: string;
  lastSeenAt: string;
  latitude: string;
  longitude: string;
  contact: string;
};

const initialData: ReportData = {
  reportType: "need_help",
  species: "",
  condition: "",
  description: "",
  locationDescription: "",
  lastSeenAt: "",
  latitude: "",
  longitude: "",
  contact: ""
};

export default function ReportClient({ locale }: { locale: Locale }) {
  const [formData, setFormData] = useState<ReportData>(initialData);
  const [submitted, setSubmitted] = useState<ReportData | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<ReportData | null>(
    null
  );
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [savedLostCaseId, setSavedLostCaseId] = useState<string | null>(null);
  const [savedReporterContact, setSavedReporterContact] = useState("");
  const [resolveReportId, setResolveReportId] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [formState, formAction] = useFormState(submitReport, {
    status: "idle"
  });
  const [resolveState, resolveAction] = useFormState(resolveLostReport, {
    status: "idle"
  });
  const searchParams = useSearchParams();
  const router = useRouter();

  const updateField = (field: keyof ReportData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (formState.status === "success" && pendingSubmission) {
      setSubmitted(pendingSubmission);
      const isLost = formState.reportType === "lost";
      setSavedReportId(isLost ? null : formState.reportId ?? null);
      setSavedLostCaseId(isLost ? formState.lostCaseId ?? null : null);
      setSavedReporterContact(isLost ? pendingSubmission.contact : "");
      if (isLost && formState.lostCaseId) {
        setResolveReportId(formState.lostCaseId);
      }
      setCopyStatus("idle");
      setFormData(initialData);
      setFormKey((current) => current + 1);
      setPendingSubmission(null);
    }
  }, [
    formState.lostCaseId,
    formState.reportId,
    formState.reportType,
    formState.status,
    pendingSubmission
  ]);

  useEffect(() => {
    const caseParam = searchParams.get("case");
    if (caseParam) {
      setResolveReportId(caseParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (resolveState.status === "success") {
      router.refresh();
    }
  }, [resolveState.status, router]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(t(locale, "report.field.useLocation.unavailable"));
      updateField("latitude", "");
      updateField("longitude", "");
      return;
    }

    setIsLocating(true);
    setLocationMessage(null);
    updateField("latitude", "");
    updateField("longitude", "");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);
        updateField("latitude", latitude);
        updateField("longitude", longitude);
        setLocationMessage(null);
        setIsLocating(false);
      },
      () => {
        setLocationMessage(
          t(locale, "report.field.useLocation.failed")
        );
        updateField("latitude", "");
        updateField("longitude", "");
        setIsLocating(false);
      }
    );
  };

  const isLost = formData.reportType === "lost";
  const fieldErrors = formState.fieldErrors ?? {};
  const notProvidedLabel = t(locale, "report.preview.notProvided");
  const resolveOptionLabel = (
    value: string,
    options: ReadonlyArray<{ value: string; labelKey: string }>
  ) => {
    if (!value) return notProvidedLabel;
    const match = options.find((option) => option.value === value);
    return match ? t(locale, match.labelKey) : value;
  };

  const handleCopyLostCaseId = async () => {
    if (!savedLostCaseId) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(savedLostCaseId);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = savedLostCaseId;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyStatus("copied");
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopyStatus("idle");
      }, 2000);
    } catch (error) {
      console.warn("Copy lost case ID failed:", error);
    }
  };

  return (
    <>
      <h1>{t(locale, "report.title")}</h1>
      <p>{t(locale, "report.intro")}</p>
      <p>{t(locale, "report.requiredNote")}</p>

      <form
        key={formKey}
        className="form"
        action={formAction}
        onSubmit={() => {
          setPendingSubmission(formData);
          setSavedReportId(null);
          setSavedLostCaseId(null);
          setSavedReporterContact("");
        }}
        noValidate
      >
        <input type="hidden" name="locale" value={locale} />
        <div className="field">
          <label htmlFor="report_type">{t(locale, "report.field.reportType.label")}</label>
          <p className="helper">{t(locale, "report.field.reportType.helper")}</p>
          <select
            id="report_type"
            name="report_type"
            value={formData.reportType}
            onChange={(event) =>
              updateField(
                "reportType",
                event.target.value as ReportData["reportType"]
              )
            }
            required
          >
            {reportTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(locale, option.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="species">{t(locale, "report.field.species.label")}</label>
          <p className="helper">{t(locale, "report.field.species.helper")}</p>
          <select
            id="species"
            name="species"
            value={formData.species}
            onChange={(event) => updateField("species", event.target.value)}
            aria-invalid={Boolean(fieldErrors.species)}
            aria-describedby={fieldErrors.species ? "species-error" : undefined}
            required
          >
            <option value="">{t(locale, "report.field.species.placeholder")}</option>
            {speciesOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(locale, option.labelKey)}
              </option>
            ))}
          </select>
          {fieldErrors.species ? (
            <p className="error" id="species-error">
              {fieldErrors.species}
            </p>
          ) : null}
        </div>

        {!isLost ? (
          <div className="field">
            <label htmlFor="condition">{t(locale, "report.field.condition.label")}</label>
            <p className="helper">{t(locale, "report.field.condition.helper")}</p>
            <select
              id="condition"
              name="condition"
              value={formData.condition}
              onChange={(event) => updateField("condition", event.target.value)}
              aria-invalid={Boolean(fieldErrors.condition)}
              aria-describedby={fieldErrors.condition ? "condition-error" : undefined}
              required
            >
              <option value="">{t(locale, "report.field.condition.placeholder")}</option>
              {conditionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(locale, option.labelKey)}
                </option>
              ))}
            </select>
            {fieldErrors.condition ? (
              <p className="error" id="condition-error">
                {fieldErrors.condition}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="description">
            {isLost
              ? t(locale, "report.field.description.labelLost")
              : t(locale, "report.field.description.labelHelp")}
          </label>
          <p className="helper">
            {isLost
              ? t(locale, "report.field.description.helperLost")
              : t(locale, "report.field.description.helperHelp")}
          </p>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={(event) => updateField("description", event.target.value)}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={fieldErrors.description ? "description-error" : undefined}
            required={isLost}
          />
          {fieldErrors.description ? (
            <p className="error" id="description-error">
              {fieldErrors.description}
            </p>
          ) : null}
        </div>

        {isLost ? (
          <div className="field">
            <label htmlFor="last_seen_at">{t(locale, "report.field.lastSeen.label")}</label>
            <p className="helper">{t(locale, "report.field.lastSeen.helper")}</p>
            <input
              id="last_seen_at"
              name="last_seen_at"
              type="datetime-local"
              value={formData.lastSeenAt}
              onChange={(event) => updateField("lastSeenAt", event.target.value)}
              aria-invalid={Boolean(fieldErrors.last_seen_at)}
              aria-describedby={
                fieldErrors.last_seen_at ? "last-seen-error" : undefined
              }
              required
            />
            {fieldErrors.last_seen_at ? (
              <p className="error" id="last-seen-error">
                {fieldErrors.last_seen_at}
              </p>
            ) : null}
          </div>
        ) : null}

        {isLost ? (
          <div className="field">
            <label htmlFor="photo">{t(locale, "report.field.photo.label")}</label>
            <p className="helper">{t(locale, "report.field.photo.helper")}</p>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-invalid={Boolean(fieldErrors.photo)}
              aria-describedby={fieldErrors.photo ? "photo-error" : undefined}
            />
            {fieldErrors.photo ? (
              <p className="error" id="photo-error">
                {fieldErrors.photo}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="locationDescription">
            {t(locale, "report.field.locationDescription.label")}
          </label>
          <p className="helper">{t(locale, "report.field.locationDescription.helper")}</p>
          <input
            id="locationDescription"
            name="location_description"
            type="text"
            value={formData.locationDescription}
            onChange={(event) =>
              updateField("locationDescription", event.target.value)
            }
            aria-invalid={Boolean(fieldErrors.location_description)}
            aria-describedby={
              fieldErrors.location_description ? "location-description-error" : undefined
            }
            required
          />
          {fieldErrors.location_description ? (
            <p className="error" id="location-description-error">
              {fieldErrors.location_description}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="latitude">{t(locale, "report.field.latitude.label")}</label>
          <p className="helper">{t(locale, "report.field.coordinates.helper")}</p>
          <input
            id="latitude"
            name="latitude"
            type="text"
            inputMode="decimal"
            value={formData.latitude}
            onChange={(event) => updateField("latitude", event.target.value)}
            aria-invalid={Boolean(fieldErrors.latitude)}
            aria-describedby={fieldErrors.latitude ? "latitude-error" : undefined}
          />
          {fieldErrors.latitude ? (
            <p className="error" id="latitude-error">
              {fieldErrors.latitude}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="longitude">{t(locale, "report.field.longitude.label")}</label>
          <p className="helper">{t(locale, "report.field.coordinates.helper")}</p>
          <input
            id="longitude"
            name="longitude"
            type="text"
            inputMode="decimal"
            value={formData.longitude}
            onChange={(event) => updateField("longitude", event.target.value)}
            aria-invalid={Boolean(fieldErrors.longitude)}
            aria-describedby={fieldErrors.longitude ? "longitude-error" : undefined}
          />
          {fieldErrors.longitude ? (
            <p className="error" id="longitude-error">
              {fieldErrors.longitude}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label>{t(locale, "report.field.useLocation.label")}</label>
          <p className="helper">{t(locale, "report.field.useLocation.helper")}</p>
          <button
            className="button"
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
          >
            {isLocating
              ? t(locale, "report.field.useLocation.loading")
              : t(locale, "report.field.useLocation.button")}
          </button>
          {locationMessage ? <p className="helper">{locationMessage}</p> : null}
        </div>

        <div className="field">
          <label htmlFor="contact">
            {isLost
              ? t(locale, "report.field.contact.labelRequired")
              : t(locale, "report.field.contact.labelOptional")}
          </label>
          <p className="helper">{t(locale, "report.field.contact.helper")}</p>
          <input
            id="contact"
            name="contact"
            type="text"
            value={formData.contact}
            onChange={(event) => updateField("contact", event.target.value)}
            aria-invalid={Boolean(fieldErrors.contact)}
            aria-describedby={fieldErrors.contact ? "contact-error" : undefined}
            required={isLost}
          />
          {fieldErrors.contact ? (
            <p className="error" id="contact-error">
              {fieldErrors.contact}
            </p>
          ) : null}
        </div>

        <SubmitButton locale={locale} />
        {formState.status === "error" ? (
          <p className="error">{formState.message}</p>
        ) : null}
        {formState.status === "success" ? (
          <p className="success">{formState.message}</p>
        ) : null}
      </form>

      {submitted?.reportType === "lost" && savedLostCaseId ? (
        <section className="preview" aria-live="polite">
          <div className="preview-header">
            <h2>{t(locale, "report.lostCase.title")}</h2>
            <span className="status-badge">{t(locale, "report.preview.saved")}</span>
          </div>
          <p className="success">
            {t(locale, "report.lostCase.savedPrefix")} {savedLostCaseId}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button className="button" type="button" onClick={handleCopyLostCaseId}>
              {copyStatus === "copied"
                ? t(locale, "report.lostCase.copied")
                : t(locale, "report.lostCase.copy")}
            </button>
          </div>
          <p className="helper">{t(locale, "report.lostCase.shareNote")}</p>
          <InlineCancelPanel
            key={savedLostCaseId}
            locale={locale}
            lostCaseId={savedLostCaseId}
            reporterContact={savedReporterContact}
          />
        </section>
      ) : null}

      {submitted ? (
        <section className="preview" aria-live="polite">
          <div className="preview-header">
            <h2>{t(locale, "report.preview.title")}</h2>
            {savedReportId ? (
              <span className="status-badge">{t(locale, "report.preview.saved")}</span>
            ) : null}
          </div>
          {savedReportId ? (
            <p className="success">
              {t(locale, "report.preview.savedPrefix")} {savedReportId}
            </p>
          ) : null}
          <dl>
            <div>
              <dt>{t(locale, "report.preview.reportType")}</dt>
              <dd>
                {submitted.reportType === "lost"
                  ? t(locale, "report.typeLost")
                  : t(locale, "report.typeRescue")}
              </dd>
            </div>
            <div>
              <dt>{t(locale, "report.preview.species")}</dt>
              <dd>{resolveOptionLabel(submitted.species, speciesOptions)}</dd>
            </div>
            {submitted.reportType === "need_help" ? (
              <div>
                <dt>{t(locale, "report.preview.condition")}</dt>
                <dd>{resolveOptionLabel(submitted.condition, conditionOptions)}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t(locale, "report.preview.description")}</dt>
              <dd>{submitted.description || t(locale, "report.preview.noNotes")}</dd>
            </div>
            {submitted.reportType === "lost" ? (
              <div>
                <dt>{t(locale, "report.preview.lastSeen")}</dt>
                <dd>{submitted.lastSeenAt || notProvidedLabel}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t(locale, "report.preview.locationDescription")}</dt>
              <dd>{submitted.locationDescription}</dd>
            </div>
            <div>
              <dt>{t(locale, "report.preview.latitude")}</dt>
              <dd>{submitted.latitude || notProvidedLabel}</dd>
            </div>
            <div>
              <dt>{t(locale, "report.preview.longitude")}</dt>
              <dd>{submitted.longitude || notProvidedLabel}</dd>
            </div>
            <div>
              <dt>{t(locale, "report.preview.contact")}</dt>
              <dd>{submitted.contact || notProvidedLabel}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {!savedLostCaseId ? (
        <section className="preview" aria-live="polite" id="found">
          <div className="preview-header">
            <h2>{t(locale, "report.resolve.title")}</h2>
          </div>
          <p>{t(locale, "report.resolve.description")}</p>
          <form className="form" action={resolveAction} noValidate>
            <input type="hidden" name="locale" value={locale} />
            <div className="field">
              <label htmlFor="report_id">{t(locale, "report.resolve.reportIdLabel")}</label>
              <input
                id="report_id"
                name="report_id"
                type="text"
                placeholder={t(locale, "report.resolve.reportIdPlaceholder")}
                value={resolveReportId}
                onChange={(event) => setResolveReportId(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="resolve_contact">{t(locale, "report.resolve.contactLabel")}</label>
              <input id="resolve_contact" name="contact" type="text" required />
            </div>
            <ResolveButton locale={locale} />
            {resolveState.status === "error" ? (
              <p className="error">{resolveState.message}</p>
            ) : null}
            {resolveState.status === "success" ? (
              <p className="success">{resolveState.message}</p>
            ) : null}
          </form>
        </section>
      ) : null}
    </>
  );
}

function SubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? t(locale, "common.loading") : t(locale, "common.submit")}
    </button>
  );
}

function ResolveButton({
  locale,
  labelKey = "report.resolve.button",
  className,
  style
}: {
  locale: Locale;
  labelKey?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className ?? "button"} type="submit" disabled={pending} style={style}>
      {pending ? t(locale, "report.resolve.loading") : t(locale, labelKey)}
    </button>
  );
}

function InlineCancelPanel({
  locale,
  lostCaseId,
  reporterContact
}: {
  locale: Locale;
  lostCaseId: string;
  reporterContact: string;
}) {
  const [contact, setContact] = useState(reporterContact);
  const [state, action] = useFormState(cancelLostReport, { ok: null });
  const cancelErrorMessage = (error?: string) => {
    if (error === "mismatch") return t(locale, "report.cancel.error_mismatch");
    if (error === "already_resolved") {
      return t(locale, "report.cancel.error_already_resolved");
    }
    return t(locale, "report.cancel.error_not_found");
  };

  return (
    <div
      className="preview"
      style={{ marginTop: 16, background: "#f6efe6", borderColor: "#eadbc8" }}
    >
      <div className="preview-header">
        <h3>{t(locale, "report.cancel.title")}</h3>
        <span
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#8a7a6b"
          }}
        >
          {t(locale, "report.lostCase.closeCaseOptional")}
        </span>
      </div>
      <p className="helper">{t(locale, "report.cancel.body")}</p>
      <form className="form" action={action} noValidate>
        <input type="hidden" name="lostCaseId" value={lostCaseId} />
        <div className="field">
          <label htmlFor="inline_resolve_contact">{t(locale, "report.resolve.contactLabel")}</label>
          <input
            id="inline_resolve_contact"
            name="reporterContact"
            type="text"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            required
          />
        </div>
        <ResolveButton
          locale={locale}
          labelKey="report.cancel.button"
          className="button"
          style={{
            background: "#eadbc8",
            color: "#4a4038",
            border: "1px solid #d6c3ae"
          }}
        />
        {state.ok === false ? <p className="error">{cancelErrorMessage(state.error)}</p> : null}
        {state.ok === true ? (
          <p className="success">{t(locale, "report.cancel.success")}</p>
        ) : null}
      </form>
    </div>
  );
}
