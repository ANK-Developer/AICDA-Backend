// 
import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5005;
const HOST = "0.0.0.0";




app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

console.log("Server file loaded...");
