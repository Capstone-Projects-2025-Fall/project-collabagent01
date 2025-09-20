interface Success<T> {
    status: number;
    success: true;
    data: T;
}

interface Error {
    status: number;
    success: false;
    error: string;
}

export type Result<T> = Success<T> | Error;
