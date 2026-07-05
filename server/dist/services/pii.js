/**
 * Automatically detects and replaces sensitive information (PII) with placeholders.
 * Returns the redacted text and a mapping to restore the original values.
 */
export function redactPII(text) {
    const mapping = {};
    let redactedText = text;
    // 1. Emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let emailCount = 1;
    redactedText = redactedText.replace(emailRegex, (match) => {
        const placeholder = `[REDACTED_EMAIL_${emailCount++}]`;
        mapping[placeholder] = match;
        return placeholder;
    });
    // 2. Student IDs (e.g. S123456, U9876543)
    const studentIdRegex = /\b[sSuU]\d{5,8}\b/g;
    let idCount = 1;
    redactedText = redactedText.replace(studentIdRegex, (match) => {
        const placeholder = `[REDACTED_STUDENT_ID_${idCount++}]`;
        mapping[placeholder] = match;
        return placeholder;
    });
    // 3. Phone Numbers
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    let phoneCount = 1;
    redactedText = redactedText.replace(phoneRegex, (match) => {
        const placeholder = `[REDACTED_PHONE_${phoneCount++}]`;
        mapping[placeholder] = match;
        return placeholder;
    });
    // 4. GPAs and grade structures (e.g. "GPA: 3.8", "GPA of 4.0")
    const gpaRegex = /\b(GPA|gpa)[:\s]+[0-4]\.\d{1,2}\b/g;
    let gpaCount = 1;
    redactedText = redactedText.replace(gpaRegex, (match) => {
        const placeholder = `[REDACTED_GPA_${gpaCount++}]`;
        mapping[placeholder] = match;
        return placeholder;
    });
    return { redactedText, mapping };
}
/**
 * Restores original sensitive data back into a text containing redacted placeholders.
 */
export function rehydratePII(text, mapping) {
    let rehydratedText = text;
    // Sorting keys by length descending prevents partial matching issues if placeholders overlap
    const sortedPlaceholders = Object.keys(mapping).sort((a, b) => b.length - a.length);
    for (const placeholder of sortedPlaceholders) {
        const originalValue = mapping[placeholder];
        rehydratedText = rehydratedText.split(placeholder).join(originalValue);
    }
    return rehydratedText;
}
