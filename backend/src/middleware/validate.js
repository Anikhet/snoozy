/**
 * Express middleware factory that validates request body against a Zod schema.
 * Returns 400 with structured errors on failure, calls next() on success.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      })
    }

    req.validated = result.data
    next()
  }
}

module.exports = { validate }
