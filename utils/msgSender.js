const fetch = require("node-fetch");
function sendtoflask(msg) {
  return new Promise((result, error) => {
    var data = JSON.stringify(msg);
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: data,
    };
    console.log("Sending a request!");
    fetch("http://127.0.0.1:5000/depression", options)
      .then(async (response) => {
        const data = await response.json();
        //console.log(data);
        if (data == "1") {
          result(1);
        } else if (data == "0") {
          result(0);
        } else if (data == "-1") {
          result(-1);
        }
      })
      .catch((err) => {
        error(err);
      });
  }).catch((err) => {
    error(err);
  });
}
module.exports = sendtoflask;

