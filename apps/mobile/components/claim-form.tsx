import {
  CLAIM_TYPES,
  createClaimSchema,
  type CreateClaimInput,
} from "@claims/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  Controller,
  useForm,
  type Control,
  type FieldPath,
} from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import type { z } from "zod";
import { ApiError, errorMessage, fieldErrorsOf } from "../lib/api";
import { ErrorText, Field, InfoText, SubmitButton } from "./form";

// New/edit claim form (docs/PLAN.md decision s: react-hook-form + zodResolver so the values survive a
// failed request without hand-rolled state). Both modes validate with createClaimSchema: the form always
// shows every field, and PATCH accepts the full set, so one schema covers both. Validation is the shared
// zod schema and nothing else; the server runs the same schema and its VALIDATION_ERROR details land back
// on the fields via setError.
//
// The form's own values are the schema INPUT type (optional fields may be null) and handleSubmit hands the
// caller the parsed OUTPUT (trimmed, defaults applied). Empty text inputs for the optional fields are
// stored as null rather than "" so that z.iso.date() does not reject an untouched incident date and the
// database keeps null for "not provided".

export type ClaimFormValues = z.input<typeof createClaimSchema>;

export type ClaimFormProps = {
  mode: "create" | "edit";
  /** Pre-fill (edit mode). Missing keys start empty. */
  initialValues?: Partial<ClaimFormValues>;
  /** Performs the request; throw to keep the form on screen with the error shown. */
  onSubmit: (values: CreateClaimInput) => Promise<void>;
};

const FIELD_NAMES: readonly FieldPath<ClaimFormValues>[] = [
  "title",
  "claim_type",
  "description",
  "incident_date",
  "policy_number",
  "claimant_name",
];

function isFieldName(name: string): name is FieldPath<ClaimFormValues> {
  return (FIELD_NAMES as readonly string[]).includes(name);
}

// Fields the schema types as `string | null | undefined`: an emptied input becomes null. title and
// description are plain strings, so they stay "" (and title's min(1) produces the right message).
const NULLABLE_FIELDS: readonly FieldPath<ClaimFormValues>[] = [
  "incident_date",
  "policy_number",
  "claimant_name",
];

export function ClaimForm({ mode, initialValues, onSubmit }: ClaimFormProps) {
  const { control, handleSubmit, setError, formState } = useForm<
    ClaimFormValues,
    unknown,
    CreateClaimInput
  >({
    resolver: zodResolver(createClaimSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      claim_type: initialValues?.claim_type ?? "",
      description: initialValues?.description ?? "",
      incident_date: initialValues?.incident_date ?? null,
      policy_number: initialValues?.policy_number ?? null,
      claimant_name: initialValues?.claimant_name ?? null,
    },
  });
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      // RHF keeps the typed values; only the message changes. Server-side field issues go under the
      // fields, everything else above the button.
      if (error instanceof ApiError) {
        const fieldErrors = fieldErrorsOf(error);
        let placed = false;
        for (const [name, messages] of Object.entries(fieldErrors)) {
          if (isFieldName(name) && messages[0]) {
            setError(name, { type: "server", message: messages[0] });
            placed = true;
          }
        }
        setServerError(
          placed ? "Please fix the highlighted fields." : error.message,
        );
      } else {
        setServerError(errorMessage(error));
      }
    }
  });

  const busy = formState.isSubmitting;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {mode === "create" ? (
          <InfoText>
            The claim is saved as a draft first; attachments are added on the
            next screen.
          </InfoText>
        ) : null}

        <TextField
          control={control}
          name="title"
          label="Title"
          placeholder="Short summary"
          editable={!busy}
        />

        <ClaimTypeField control={control} disabled={busy} />

        <DescriptionField control={control} disabled={busy} />

        {/* Phase-3 simplification: a typed ISO date instead of a picker (no date-picker package is
            installed). z.iso.date() rejects anything but YYYY-MM-DD, so the hint matters. */}
        <TextField
          control={control}
          name="incident_date"
          label="Incident date"
          hint="Format: YYYY-MM-DD, e.g. 2026-08-30"
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          editable={!busy}
        />

        <TextField
          control={control}
          name="policy_number"
          label="Policy number"
          autoCapitalize="characters"
          editable={!busy}
        />

        <TextField
          control={control}
          name="claimant_name"
          label="Claimant name"
          autoCapitalize="words"
          editable={!busy}
        />

        <ErrorText message={serverError} />
        <SubmitButton
          title={mode === "create" ? "Save draft" : "Save changes"}
          busy={busy}
          onPress={() => void submit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type TextFieldProps = {
  control: Control<ClaimFormValues, unknown, CreateClaimInput>;
  name: FieldPath<ClaimFormValues>;
  label: string;
  hint?: string;
} & TextInputProps;

/** Field wired to react-hook-form; shows the field's validation or server error underneath. */
function TextField({ control, name, label, hint, ...input }: TextFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={styles.fieldWrap}>
          <Field
            label={label}
            value={toText(field.value)}
            onChangeText={(text) =>
              field.onChange(
                text === "" && NULLABLE_FIELDS.includes(name) ? null : text,
              )
            }
            onBlur={field.onBlur}
            {...input}
          />
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          <ErrorText message={fieldState.error?.message ?? null} />
        </View>
      )}
    />
  );
}

/**
 * Multi-line description. Not a `Field`: its TextInput style is fixed (a `style` prop passed through would
 * replace it rather than extend it), so the input is rendered here with the same look plus a minimum
 * height. On iOS `numberOfLines` does not size a TextInput, hence the explicit minHeight.
 */
function DescriptionField({
  control,
  disabled,
}: {
  control: Control<ClaimFormValues, unknown, CreateClaimInput>;
  disabled: boolean;
}) {
  return (
    <Controller
      control={control}
      name="description"
      render={({ field, fieldState }) => (
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What happened?"
            placeholderTextColor="#8a8a8a"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            editable={!disabled}
            value={toText(field.value)}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
          <ErrorText message={fieldState.error?.message ?? null} />
        </View>
      )}
    />
  );
}

/**
 * Pick-list chips for CLAIM_TYPES (brief: the agent picks from the short list in packages/shared; no free
 * text). The column is plain text with no CHECK (decision c), so a stored value that has since been edited
 * out of the list is shown as one extra, selected chip: the agent can keep it or pick a current one.
 */
function ClaimTypeField({
  control,
  disabled,
}: {
  control: Control<ClaimFormValues, unknown, CreateClaimInput>;
  disabled: boolean;
}) {
  return (
    <Controller
      control={control}
      name="claim_type"
      render={({ field, fieldState }) => {
        const current = toText(field.value);
        const options: readonly string[] =
          current !== "" &&
          !(CLAIM_TYPES as readonly string[]).includes(current)
            ? [...CLAIM_TYPES, current]
            : CLAIM_TYPES;
        return (
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Claim type</Text>
            <View style={styles.chips}>
              {options.map((type) => {
                const selected = current === type;
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled }}
                    disabled={disabled}
                    onPress={() => field.onChange(type)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <ErrorText message={fieldState.error?.message ?? null} />
          </View>
        );
      }}
    />
  );
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 24, gap: 16 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 14, color: "#444" },
  hint: { fontSize: 12, color: "#6b7280" },
  // Mirrors Field's input style in components/form.tsx (see DescriptionField).
  input: {
    borderWidth: 1,
    borderColor: "#c8c8c8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  multiline: { minHeight: 120 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#c8c8c8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  chipSelected: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  chipText: { fontSize: 14, color: "#1f2937" },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
});
