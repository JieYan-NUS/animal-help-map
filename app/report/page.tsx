"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { resolveLostReport, submitReport } from "@/app/report/actions";

const speciesOptions = ["Dog", "Cat", "Bird", "Other"] as const;
const conditionOptions = [
  "Injured",
  "Sick",
  "Trapped",
  "Stray",
  "Nursing",
  "Unknown"
] as const;
const reportTypeOptions = [
  { value: "need_help", label: "Animal in need" },
  { value: "lost", label: "Lost animal" }
] as const;

type ReportData = {
  reportType: "need_help" | "lost";
  species: (typeof speciesOptions)[number] | "";
  condition: (typeof conditionOptions)[number] | "";
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

export default function ReportPage() {
  const [formData, setFormData] = useState<ReportData>(initialData);
  const [submitted, setSubmitted] = useState<ReportData | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<ReportData | null>(
    null
  );
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [formState, formAction] = useFormState(submitReport, {
    status: "idle"
  });
  const [resolveState, resolveAction] = useFormState(resolveLostReport, {
    status: "idle"
  });

  const updateField = (field: keyof ReportData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (formState.status === "success" && pendingSubmission) {
      setSubmitted(pendingSubmission);
      setSavedReportId(formState.reportId ?? null);
      setFormData(initialData);
      setFormKey((current) => current + 1);
      setPendingSubmission(null);
    }
  }, [formState.reportId, formState.status, pendingSubmission]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Location isn't available in this browser.");
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
          "We couldn't access your location. You can leave these fields blank."
        );
        updateField("latitude", "");
        updateField("longitude", "");
        setIsLocating(false);
      }
    );
  };

  const isLost = formData.reportType === "lost";
  const fieldErrors = formState.fieldErrors ?? {};

  return (
    <>
      <h1>Report an Animal</h1>
      <p>
        Share what you saw in simple words. A short report can help neighbors,
        shelters, and responders act quickly.
      </p>
      <p>Fields marked “required” help responders act quickly and safely.</p>

      <form
        key={formKey}
        className="form"
        action={formAction}
        encType="multipart/form-data"
        onSubmit={() => {
          setPendingSubmission(formData);
          setSavedReportId(null);
        }}
        noValidate
      >
        <div className="field">
          <label htmlFor="report_type">Report type (required)</label>
          <p className="helper">
            Choose the kind of report so responders see the right urgency.
          </p>
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
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="species">Species (required)</label>
          <p className="helper">
            Helps volunteers understand the animal's needs and typical care.
          </p>
          <select
            id="species"
            name="species"
            value={formData.species}
            onChange={(event) => updateField("species", event.target.value)}
            aria-invalid={Boolean(fieldErrors.species)}
            aria-describedby={fieldErrors.species ? "species-error" : undefined}
            required
          >
            <option value="">Select a species</option>
            {speciesOptions.map((option) => (
              <option key={option} value={option}>
                {option}
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
            <label htmlFor="condition">Condition (required)</label>
            <p className="helper">
              Gives responders a sense of urgency and the right kind of help.
            </p>
            <select
              id="condition"
              name="condition"
              value={formData.condition}
              onChange={(event) => updateField("condition", event.target.value)}
              aria-invalid={Boolean(fieldErrors.condition)}
              aria-describedby={fieldErrors.condition ? "condition-error" : undefined}
              required
            >
              <option value="">Select a condition</option>
              {conditionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
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
            {isLost ? "Identifying description (required)" : "Description (optional)"}
          </label>
          <p className="helper">
            {isLost
              ? "Share markings, collar details, or anything that helps identify them."
              : "Note appearance or behavior (for example: limping, hiding, or calm)."}
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
            <label htmlFor="last_seen_at">Last seen (required)</label>
            <p className="helper">
              Helps responders prioritize the freshest sightings.
            </p>
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
            <label htmlFor="photo">Photo (optional, recommended)</label>
            <p className="helper">
              One clear photo helps neighbors confirm sightings quickly.
            </p>
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
            Location description (required)
          </label>
          <p className="helper">
            Helps others find the animal quickly and avoid confusion.
          </p>
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
          <label htmlFor="latitude">Latitude (optional)</label>
          <p className="helper">
            If you don't know, leave blank. You can describe the location in words.
          </p>
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
          <label htmlFor="longitude">Longitude (optional)</label>
          <p className="helper">
            If you don't know, leave blank. You can describe the location in words.
          </p>
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
          <label>Use current location (optional)</label>
          <p className="helper">
            We only use your location to fill these fields. Nothing is shared
            unless you submit the form.
          </p>
          <button
            className="button"
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? "Finding your location..." : "Use my current location"}
          </button>
          {locationMessage ? <p className="helper">{locationMessage}</p> : null}
        </div>

        <div className="field">
          <label htmlFor="contact">
            Contact info {isLost ? "(required)" : "(optional)"}
          </label>
          <p className="helper">
            Share an email or phone number so helpers can reach you.
          </p>
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

        <SubmitButton />
        {formState.status === "error" ? (
          <p className="error">{formState.message}</p>
        ) : null}
        {formState.status === "success" ? (
          <p className="success">{formState.message}</p>
        ) : null}
      </form>

      {submitted ? (
        <section className="preview" aria-live="polite">
          <div className="preview-header">
            <h2>Report Preview</h2>
            {savedReportId ? (
              <span className="status-badge">Saved</span>
            ) : null}
          </div>
          {savedReportId ? (
            <p className="success">
              Report saved. Reference ID: {savedReportId}
            </p>
          ) : null}
          <dl>
            <div>
              <dt>Report type</dt>
              <dd>
                {submitted.reportType === "lost"
                  ? "Lost animal"
                  : "Animal in need"}
              </dd>
            </div>
            <div>
              <dt>Species</dt>
              <dd>{submitted.species}</dd>
            </div>
            {submitted.reportType === "need_help" ? (
              <div>
                <dt>Condition</dt>
                <dd>{submitted.condition}</dd>
              </div>
            ) : null}
            <div>
              <dt>Description</dt>
              <dd>{submitted.description || "No additional notes provided."}</dd>
            </div>
            {submitted.reportType === "lost" ? (
              <div>
                <dt>Last seen</dt>
                <dd>{submitted.lastSeenAt || "Not provided."}</dd>
              </div>
            ) : null}
            <div>
              <dt>Location description</dt>
              <dd>{submitted.locationDescription}</dd>
            </div>
            <div>
              <dt>Latitude</dt>
              <dd>{submitted.latitude || "Not provided."}</dd>
            </div>
            <div>
              <dt>Longitude</dt>
              <dd>{submitted.longitude || "Not provided."}</dd>
            </div>
            <div>
              <dt>Contact info</dt>
              <dd>{submitted.contact || "Not provided."}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section className="preview" aria-live="polite">
        <div className="preview-header">
          <h2>Mark a lost report as found</h2>
        </div>
        <p>
          If you filed a lost animal report, share your report ID and the same
          contact info to mark it as found.
        </p>
        <form className="form" action={resolveAction} noValidate>
          <div className="field">
            <label htmlFor="report_id">Report ID (required)</label>
            <input id="report_id" name="report_id" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="resolve_contact">Contact info (required)</label>
            <input id="resolve_contact" name="contact" type="text" required />
          </div>
          <ResolveButton />
          {resolveState.status === "error" ? (
            <p className="error">{resolveState.message}</p>
          ) : null}
          {resolveState.status === "success" ? (
            <p className="success">{resolveState.message}</p>
          ) : null}
        </form>
      </section>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Submit Report"}
    </button>
  );
}

function ResolveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Updating..." : "Mark as Found"}
    </button>
  );
}
