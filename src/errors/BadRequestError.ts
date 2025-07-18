export class BadRequestError extends Error {
  status: number;

  constructor(message: string = "Bad Request") {
    super(message);
    this.name = "BadRequestError";
    this.status = 400;
  }
}
