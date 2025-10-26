const http = require("http");
const fs = require("fs").promises;
const { program } = require("commander");
const { XMLBuilder } = require("fast-xml-parser");
const url = require("url");

// ������������ ��������� ���������� �����
program
  .requiredOption("-i, --input <path>", "Input file path")
  .requiredOption("-h, --host <host>", "Host address")
  .requiredOption("-p, --port <port>", "Port number");

program.parse(process.argv);
const options = program.opts();

// ��������� HTTP �������
const server = http.createServer(async (req, res) => {
  const query = url.parse(req.url, true).query;

  try {
    // ���������� ������� �����
    const data = await fs.readFile(options.input, "utf8");

    // ������� NDJSON (����� ����� - ������� JSON)
    const flights = data
      .trim()
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line));

    // Գ�������� �� ���������� airtime_min
    let filtered = flights;
    if (query.airtime_min) {
      const min = parseFloat(query.airtime_min);
      filtered = filtered.filter(f => f.AIR_TIME >= min);
    }

    // ���������� ��'���� ��� ����������� � XML
    const xmlData = {
      root: {
        flights: {
          flight: filtered.slice(0, 20).map(f => {
            const flightObj = {};
            if (query.date === "true" && f.FL_DATE) flightObj.date = f.FL_DATE;
            if (f.AIR_TIME) flightObj.air_time = f.AIR_TIME;
            if (f.DISTANCE) flightObj.distance = f.DISTANCE;
            return flightObj;
          })
        }
      }
    };

    // ��������� XML � ��������� XMLBuilder
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false
    });
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(xmlData);

    // ³������� XML-������
    res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
    res.end(xml);

  } catch (err) {
    console.error("? Error:", err.message);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

// ������ HTTP �������
server.listen(options.port, options.host, () => {
  console.log(`? Server running at http://${options.host}:${options.port}/`);
});