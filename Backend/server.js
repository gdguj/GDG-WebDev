require("dotenv").config();
const mongoose = require("mongoose"); 
const app = require("./src/app");

const PORT = process.env.PORT || 5000;

// MongoDB (اتصال تيست)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
  });