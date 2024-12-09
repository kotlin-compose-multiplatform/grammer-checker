const express = require("express");
const axios = require("axios");
const cors = require("cors");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const OpenAI = require("openai");
require("dotenv").config();

const apiKey = process.env.OPEN_AI_KEY;

const openai = new OpenAI({
  apiKey: apiKey,
});

const app = express();
const port = 3008;

// Enable CORS to allow requests from your frontend
app.use(cors());
app.use(express.json()); // Middleware to parse JSON request body

app.get("/ai", async (req, res) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: "Write a haiku about recursion in programming.",
      },
    ],
  });

  res.send(completion.choices[0].message);
});

// Endpoint to proxy the grammar checker API
app.post("/proxy/spellcheck", async (req, res) => {
  const { text } = req.body; // Get the text from the request

  try {
    // Make a POST request to the external API
    const response = await axios.post(
      "https://enedilim.com/spellchecker/spellcheck",
      {
        text,
      }
    );

    // Send the API response back to the client
    res.json(response.data);
  } catch (error) {
    console.error("Error calling the spellcheck API:", error);
    res.status(500).json({ error: "Failed to contact the spellcheck API" });
  }
});

async function extractWordData(url) {
  try {
    // Fetch the HTML
    console.log(url);
    const response = await axios.get(url);
    const html = response.data;

    // Parse the HTML using JSDOM
    const dom = new JSDOM(html);
    const document = dom.window.document;
    console.log(document);

    // Extract words
    const wordElements = document.querySelectorAll(".word-text");
    const words = Array.from(wordElements).map((li) => li.textContent.trim());

    // Extract descriptions and examples (example data points in the HTML structure assumed for this part)
    const descriptions = document.querySelectorAll(".def"); // Assume a description block exists in the HTML (not provided in sample).
    //const examples = Array.from(descriptions.querySelectorAll(".")).map((li)=> {}); // Assume examples block exists in the HTML (not provided in sample).
    console.log(descriptions);
    return {
      words,
      descriptions,
      //examples,
    };
  } catch (error) {
    // console.error("Error fetching or parsing HTML:", error);
    return null;
  }
}

app.post("/get-word", async (req, res) => {
  const [words] = req.body;

  // Array to hold the results for each word
  const results = [];

  // Iterate over the words and process them
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    try {
      const data = await extractWordData(
        `https://enedilim.com/sozluk/soz/${word}`
      );
      if (data) {
        results.push({
          word: word,
          descriptions: data.descriptions || [],
          examples: data.examples || [],
        });
      } else {
        results.push({
          word: word,
          descriptions: ["No data found"],
          examples: [],
        });
      }
    } catch (error) {
      console.error(`Error processing word "${word}":`, error);
      results.push({
        word: word,
        descriptions: ["Error fetching data"],
        examples: [],
      });
    }
  }

  // Send the aggregated results back to the client
  res.json(results);
});

// Start the server
app.listen(port, () => {
  console.log(`Proxy server running on http://localhost:${port}`);
});
