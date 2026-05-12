const axios = require("axios");

const JDOODLE_URL = "https://api.jdoodle.com/v1/execute";
const CLIENT_ID = process.env.JDOODLE_CLIENT_ID;
const CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET;

// JDoodle language map
const languageMap = {
  "javascript": { language: "nodejs",  versionIndex: "4" },
  "python":     { language: "python3", versionIndex: "4" },
  "java":       { language: "java",    versionIndex: "4" },
  "c++":        { language: "cpp17",   versionIndex: "1" },
  "c":          { language: "c",       versionIndex: "5" },
};

const getLanguageConfig = (lang) => {
  const config = languageMap[lang.toLowerCase()];
  if (!config) throw new Error(`Unsupported language: ${lang}`);
  return config;
};

// Run a single test case on JDoodle
const runSingleTestCase = async (code, language, stdin) => {
  const { language: lang, versionIndex } = getLanguageConfig(language);

  const { data } = await axios.post(JDOODLE_URL, {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    script: code,
    language: lang,
    versionIndex,
    stdin,
  });

  console.log("JDOODLE RAW RESPONSE:", JSON.stringify(data, null, 2));

  return data;
};

// Run all test cases one by one
const runAllTestCases = async (code, language, testCases) => {
  const results = [];

  for (const testCase of testCases) {
    try {
      const result = await runSingleTestCase(code, language, testCase.input);
      const actualOutput = result.output?.trim() ?? "";
      const expectedOutput = testCase.output?.trim() ?? "";

      // FIX 1: JDoodle always returns HTTP 200.
      // Detect errors by checking for non-zero exit code or the word "error" in output.
      // result.statusCode in the body is the HTTP code (always 200).
      // result.error field exists when there's a compilation/runtime problem.
      const hasError = !!result.error || (result.cpuTime === undefined && result.memory === undefined);
      const passed = !hasError && actualOutput === expectedOutput;

      results.push({
        input: testCase.input,
        expected: expectedOutput,
        output: actualOutput,
        passed,
        memory: result.memory,
        cpuTime: result.cpuTime,
        // FIX 1: use result.error (JDoodle's actual error field) not statusCode check
        error: result.error ?? null,
      });
    } catch (err) {
      results.push({
        input: testCase.input,
        expected: testCase.output,
        output: null,
        passed: false,
        error: err.message,
      });
    }
  }

  return results;
};

module.exports = { runAllTestCases };