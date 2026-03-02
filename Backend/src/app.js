const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const aiRoutes = require("./routes/ai.routes");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

// Disable caching on API responses to avoid 304 Not Modified issues
app.use('/api', (req, res, next) => {
	res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	res.set('Pragma', 'no-cache');
	res.set('Expires', '0');
	res.set('Surrogate-Control', 'no-store');
	next();
});

// Routes
app.use("/api/ai", aiRoutes);

// Error middleware
app.use(errorMiddleware);

module.exports = app;

//word grid
const wordGridRoutes = require("./routes/wordGrid.routes");
app.use("/word-grid", wordGridRoutes);