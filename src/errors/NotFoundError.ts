export class NotFoundError extends Error {
  status: number;

  constructor(message: string = "Not Found") {
    super(message);
    this.name = "NotFoundError";
    this.status = 404;
  }
}
