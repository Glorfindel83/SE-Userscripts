SELECT RANK() OVER (ORDER BY percentage DESC), * FROM (
SELECT site,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM snapshots
    WHERE timestamp BETWEEN '2020-04-01' AND '2021-04-01'), 2) AS "percentage",
  COUNT(DISTINCT(question)) AS "questions"
  FROM snapshots
  WHERE timestamp BETWEEN '2020-04-01' AND '2021-04-01'
  GROUP BY site
) AS temp ORDER BY percentage DESC