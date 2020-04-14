-- HNQ analysis: https://meta.stackexchange.com/q/338009 --

-- top sites (# of questions)
WITH questionsBySite AS (
SELECT site, COUNT(DISTINCT(question)) AS questions
  FROM snapshots
  WHERE timestamp >= '2019-08-01'
  GROUP BY site),
sitesByQuestions AS (SELECT RANK() OVER (ORDER BY questions DESC) AS rank, site, questions,
  ROUND(100 * CAST(questions AS NUMERIC) / (SELECT SUM(questions) FROM questionsBySite), 2) AS percentage
  FROM questionsBySite)
SELECT * FROM sitesByQuestions
  ORDER BY questions DESC;
  
-- top sites (# of spots)
WITH spotsBySite AS (
SELECT site, COUNT(*) AS spots
  FROM snapshots
  WHERE timestamp >= '2019-08-01'
  GROUP BY site),
sitesBySpots AS (SELECT RANK() OVER (ORDER BY spots DESC) AS rank, site, spots,
  ROUND(100 * CAST(spots AS NUMERIC) / (SELECT SUM(spots) FROM spotsBySite), 2) AS percentage
  FROM spotsBySite)
SELECT * FROM sitesBySpots
  ORDER BY spots DESC;

-- sites with most HNQ views per hour
WITH questionsBySite AS (
SELECT site, COUNT(DISTINCT(question)) AS questions
  FROM snapshots
  WHERE timestamp >= '2019-08-01'
  GROUP BY site),
sitesByQuestions AS (SELECT RANK() OVER (ORDER BY questions DESC) AS rank, site, questions,
  ROUND(100 * CAST(questions AS NUMERIC) / (SELECT SUM(questions) FROM questionsBySite), 2) AS percentage
  FROM questionsBySite),
spotsBySite AS (
SELECT site, COUNT(*) AS spots
  FROM snapshots
  WHERE timestamp >= '2019-08-01'
  GROUP BY site),
sitesBySpots AS (SELECT RANK() OVER (ORDER BY spots DESC) AS rank, site, spots,
  ROUND(100 * CAST(spots AS NUMERIC) / (SELECT SUM(spots) FROM spotsBySite), 2) AS percentage
  FROM spotsBySite),
temp AS (SELECT s.site, s.question,
  MIN(s.views) AS "Views before HNQ",
  MIN(s.timestamp) - q.createddate AS "Pre-HNQ duration",
  MAX(s.views) - MIN(s.views) AS "Views while HNQ",
  MAX(s.timestamp) - MIN(s.timestamp) AS "HNQ duration"
  FROM snapshots AS s
  INNER JOIN questions AS q ON s.site = q.site AND s.question = q.id
  WHERE s.timestamp >= '2019-08-01'
    AND s.views IS NOT NULL
  GROUP BY s.site, s.question, q.createddate
  HAVING MAX(s.views) > MIN(s.views)),
stats AS (SELECT site,
  ROUND(AVG("Views before HNQ"), 0) AS "Views before HNQ",
  DATE_TRUNC('minute', AVG("Pre-HNQ duration")) AS "Pre-HNQ duration",
  ROUND(AVG(3600 * "Views before HNQ" / CAST(EXTRACT(EPOCH FROM "Pre-HNQ duration") AS NUMERIC)), 1) AS "Pre-HNQ views per hour",
  ROUND(AVG("Views while HNQ"), 0) AS "Views while HNQ",
  DATE_TRUNC('minute', AVG("HNQ duration")) AS "HNQ duration",
  ROUND(AVG(3600 * "Views while HNQ" / CAST(EXTRACT(EPOCH FROM "HNQ duration") AS NUMERIC)), 1) AS "HNQ views per hour"
  FROM Temp
  GROUP BY site)
SELECT stats.*, q.rank, q.percentage, s.rank, s.percentage
  FROM stats
  INNER JOIN sitesByQuestions AS q ON q.site = stats.site
  INNER JOIN sitesBySpots AS s ON s.site = stats.site
  ORDER BY 7 DESC


