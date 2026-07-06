declare namespace Express {
  interface Request {
    user?: {
      id: string;
      phone: string;
      role: string;
    };
  }
}
