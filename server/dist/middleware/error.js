export function errorHandler(err, req, res, next) {
    console.error('Unhandled API Error:', err);
    const status = err.statusCode || err.status || 500;
    const message = err.message || 'Internal server error.';
    res.status(status).json({
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
}
