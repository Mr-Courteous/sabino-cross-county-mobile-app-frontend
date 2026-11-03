/**
 * Password Validation Utility
 * Enforces strict password requirements for both schools and students
 */

export interface PasswordRequirement {
    label: string;
    test: (password: string) => boolean;
    met: boolean;
}

export interface PasswordValidationResult {
    isValid: boolean;
    requirements: PasswordRequirement[];
    errorMessage: string;
}

/**
 * Validates password against strict requirements:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special symbol
 * - Minimum 8 characters
 */
export function validatePassword(password: string): PasswordValidationResult {
    const requirements: PasswordRequirement[] = [
        {
            label: 'At least 8 characters',
            test: (pwd) => pwd.length >= 8,
            met: password.length >= 8,
        },
        {
            label: 'One uppercase letter (A-Z)',
            test: (pwd) => /[A-Z]/.test(pwd),
            met: /[A-Z]/.test(password),
        },
        {
            label: 'One lowercase letter (a-z)',
            test: (pwd) => /[a-z]/.test(pwd),
            met: /[a-z]/.test(password),
        },
        {
            label: 'One number (0-9)',
            test: (pwd) => /[0-9]/.test(pwd),
            met: /[0-9]/.test(password),
        },
        {
            label: 'One special symbol (!@#$%^&*)',
            test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
            met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        },
    ];

    const allMet = requirements.every((req) => req.met);
    const unmetRequirements = requirements.filter((req) => !req.met);

    return {
        isValid: allMet,
        requirements,
        errorMessage: allMet
            ? ''
            : `Password must include: ${unmetRequirements.map((r) => r.label).join(', ')}`,
    };
}

/**
 * Get a user-friendly error message for password validation
 */
export function getPasswordErrorMessage(password: string): string {
    const validation = validatePassword(password);
    return validation.errorMessage;
}

/**
 * Check if password is strong enough
 */
export function isPasswordStrong(password: string): boolean {
    return validatePassword(password).isValid;
}
