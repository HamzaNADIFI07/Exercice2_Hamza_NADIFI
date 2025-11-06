import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 5050;
const HOST = process.env.HOST || "127.0.0.1";

app.listen(PORT, () => {
  console.log(`API prête → http://${HOST}:${PORT}`);
});
