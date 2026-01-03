"use client";

import { useState } from "react";

const speciesOptions = ["Dog", "Cat", "Bird", "Other"] as const;
const conditionOptions = [
  "Injured",
  "Sick",
  "Trapped",
  "Stray",
  "Nursing",
  "Unknown"
] as const;

type ReportData = {
  species: (typeof speciesOptions)[number] | "";
  condition: (typeof conditionOptions)[number] | "";
  description: string;
  locationDescription: string;
  latitude: string;
  longitude: string;
  contact: string;
};

type FieldErrors = Partial<Record<keyof ReportData, string>>;

const initialData: ReportData = {
  species: "",
  condition: "",
  description: "",
  locationDescription: "",
  latitude: "",
  longitude: "",
  contact: ""
};

export default function ReportPage() {
  const [formData, setFormData] = useState<ReportData>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState<ReportData | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const updateField = (field: keyof ReportData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (!formData.species) {
      nextErrors.species = "Please choose a species.";
    }

    if (!formData.condition) {
      nextErrors.condition = "Please choose the animal's condition.";
    }

    if (!formData.locationDescription.trim()) {
      nextErrors.locationDescription = "Please share a brief location note.";
    }

    const latitudeValue = Number(formData.latitude);
    const longitudeValue = Number(formData.longitude);

    if (formData.latitude.trim() && !Number.isFinite(latitudeValue)) {
      nextErrors.latitude = "Latitude must be a valid number.";
    }

    if (formData.longitude.trim() && !Number.isFinite(longitudeValue)) {
      nextErrors.longitude = "Longitude must be a valid number.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError(null);

    if (Object.values(nextErrors).some(Boolean)) {
      setSubmitted(null);
      setSavedReportId(null);
      return;
    }

    setIsSaving(true);
    setSavedReportId(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          species: formData.species,
          condition: formData.condition,
          description: formData.description,
          locationDescription: formData.locationDescription,
          latitude: formData.latitude,
          longitude: formData.longitude,
          contact: formData.contact
        })
      });

      if (!response.ok) {
        setSubmitError(
          "We couldn't save your report just now. Please try again."
        );
        setSubmitted(null);
        setSavedReportId(null);
        return;
      }

      let data: { ok?: boolean; id?: string };

      try {
        data = (await response.json()) as { ok?: boolean; id?: string };
      } catch (error) {
        setSubmitError(
          "We couldn't save your report just now. Please try again."
        );
        setSubmitted(null);
        setSavedReportId(null);
        return;
      }

      if (data?.ok !== true) {
        setSubmitError(
          "We couldn't save your report just now. Please try again."
        );
        setSubmitted(null);
        setSavedReportId(null);
        return;
      }

      setSubmitted({ ...formData });
      setSavedReportId(data.id ?? null);
      setSubmitError(null);
      setFormData(initialData);
    } catch (error) {
      setSubmitError(
        "We couldn't save your report just now. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <>
      <h1>Report an Animal in Need</h1>
      <p>
        Share what you saw in simple words. A short report can help neighbors
        and local professionals respond with care.
      </p>
      <p>Fields marked “required” help responders act quickly and safely.</p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="species">Species (required)</label>
          <p className="helper">
            Helps volunteers understand the animal's needs and typical care.
          </p>
          <select
            id="species"
            value={formData.species}
            onChange={(event) => updateField("species", event.target.value)}
            aria-invalid={Boolean(errors.species)}
            aria-describedby={errors.species ? "species-error" : undefined}
            required
          >
            <option value="">Select a species</option>
            {speciesOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.species ? (
            <p className="error" id="species-error">
              {errors.species}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="condition">Condition (required)</label>
          <p className="helper">
            Gives responders a sense of urgency and the right kind of help.
          </p>
          <select
            id="condition"
            value={formData.condition}
            onChange={(event) => updateField("condition", event.target.value)}
            aria-invalid={Boolean(errors.condition)}
            aria-describedby={errors.condition ? "condition-error" : undefined}
            required
          >
            <option value="">Select a condition</option>
            {conditionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.condition ? (
            <p className="error" id="condition-error">
              {errors.condition}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="description">Description (optional)</label>
          <p className="helper">
            Note appearance or behavior (for example: limping, hiding, or calm).
          </p>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="locationDescription">
            Location description (required)
          </label>
          <p className="helper">
            Helps others find the animal quickly and avoid confusion.
          </p>
          <input
            id="locationDescription"
            type="text"
            value={formData.locationDescription}
            onChange={(event) =>
              updateField("locationDescription", event.target.value)
            }
            aria-invalid={Boolean(errors.locationDescription)}
            aria-describedby={
              errors.locationDescription ? "location-description-error" : undefined
            }
            required
          />
          {errors.locationDescription ? (
            <p className="error" id="location-description-error">
              {errors.locationDescription}
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
            type="text"
            inputMode="decimal"
            value={formData.latitude}
            onChange={(event) => updateField("latitude", event.target.value)}
            aria-invalid={Boolean(errors.latitude)}
            aria-describedby={errors.latitude ? "latitude-error" : undefined}
          />
          {errors.latitude ? (
            <p className="error" id="latitude-error">
              {errors.latitude}
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
            type="text"
            inputMode="decimal"
            value={formData.longitude}
            onChange={(event) => updateField("longitude", event.target.value)}
            aria-invalid={Boolean(errors.longitude)}
            aria-describedby={errors.longitude ? "longitude-error" : undefined}
          />
          {errors.longitude ? (
            <p className="error" id="longitude-error">
              {errors.longitude}
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
          <label htmlFor="contact">Contact info (optional)</label>
          <p className="helper">
            Share an email or phone number if you want follow-up questions.
          </p>
          <input
            id="contact"
            type="text"
            value={formData.contact}
            onChange={(event) => updateField("contact", event.target.value)}
          />
        </div>

        <button className="button" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Submit Report"}
        </button>
        {submitError ? <p className="error">{submitError}</p> : null}
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
              <dt>Species</dt>
              <dd>{submitted.species}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{submitted.condition}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{submitted.description || "No additional notes provided."}</dd>
            </div>
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
    </>
  );
}
