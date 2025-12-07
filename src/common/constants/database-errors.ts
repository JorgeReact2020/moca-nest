/**
 * PostgreSQL Error Codes
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PostgresErrorCode = {
  /**
   * Unique constraint violation
   * Occurs when trying to insert a duplicate value in a column with UNIQUE constraint
   */
  UNIQUE_VIOLATION: '23505',

  /**
   * Foreign key violation
   * Occurs when trying to insert/update a row with an invalid foreign key reference
   */
  FOREIGN_KEY_VIOLATION: '23503',

  /**
   * Not null violation
   * Occurs when trying to insert NULL into a NOT NULL column
   */
  NOT_NULL_VIOLATION: '23502',

  /**
   * Check constraint violation
   * Occurs when a CHECK constraint is violated
   */
  CHECK_VIOLATION: '23514',
} as const;

export type PostgresErrorCode =
  (typeof PostgresErrorCode)[keyof typeof PostgresErrorCode];

/**
 * Interface for PostgreSQL database errors
 */
interface DatabaseError {
  code: string;
  detail?: string;
  table?: string;
  constraint?: string;
}

/**
 * Type guard to check if an error is a database error with a code
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as DatabaseError).code === 'string'
  );
}
