const axios = require("axios");
const express = require("express");

const app = express();
const port = 3000;
const WINDOW_SIZE = 10;
const numbersStore = new Set();

const API_URLS = {
  p: "http://20.244.56.144/evaluation-service/primes",
  f: "http://20.244.56.144/evaluation-service/fibo",
  e: "http://20.244.56.144/evaluation-service/even",
  r: "http://20.244.56.144/evaluation-service/rand",
};

const numbers = async (numberType) => {
  try {
    const source = axios.CancelToken.source();
    setTimeout(() => {
      source.cancel("Request timed out");
    }, 500);
    const response = await axios.get(API_URLS[numberType], {
      cancelToken: source.token,
    });
    console.log(response.data);
    return response.data.numbers || [];
  } catch (error) {
    return [];
  }
};

const updateNumbersStore = (newNumbers) => {
    const prevState = Array.from(numbersStore);
  newNumbers.forEach((num) => numbersStore.add(num));
  const numbersArray = Array.from(numbersStore);
  if (numbersArray.length > WINDOW_SIZE) {
    numbersStore.clear();
    numbersArray
      .slice(numbersArray.length - WINDOW_SIZE)
      .forEach((num) => numbersStore.add(num));
  }
  return {
    prevState,
    currState: Array.from(numbersStore),
  };
};

const calculateAverage = () => {
  const numbersArray = Array.from(numbersStore);
  if (numbersArray.length === 0) return 0;
  let sum = 0;
  for (let num of numbersArray) {
    sum += num;
  }
  return sum / numbersArray.length;
};

app.get("/numbers/:numberId", async (req, res) => {
  const { numberId } = req.params;
  if (!API_URLS[numberId]) {
    return res.status(400).json({ error: "Invalid number type" });
  }
  const newNumbers = await numbers(numberId);
  const {prevState, currState} = updateNumbersStore(newNumbers);

  res.json({
    windowPrevState: prevState,
    windowCurrState: currState,
    numbers: Array.from(numbersStore),
    average: calculateAverage(),
  });
});
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});