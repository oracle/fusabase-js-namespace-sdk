// Type declarations for list.js

/**
 * ListResult - Class representing the list of files present.
 */
export class ListResult {
  /**
   * Array of items (file paths).
   */
  readonly items: any[];

  /**
   * Token for the next page of results, or null if there are no more results.
   */
  readonly nextPageToken: string | null;

  /**
   * Array of prefixes (directory paths).
   */
  readonly prefixes: any[];

  /**
   * Creates a new ListResult instance.
   *
   * @param {Object} data - Data object containing items, prefixes, and nextPageToken.
   */
  constructor(data: { items: any[]; prefixes: any[]; nextPageToken: string | null });
}
