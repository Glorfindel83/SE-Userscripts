SELECT RANK() OVER (ORDER BY percentage DESC), * FROM (
SELECT site,
  ROUND(100.0 * SUM(CASE
    WHEN timestamp BETWEEN '2018-11-02 18:36:00' AND '2018-11-05 05:30:00'
      OR timestamp >= '2018-11-06 06:27:00' THEN 3 -- minutes
    ELSE 10 -- minutes
    END) /
        (SELECT SUM(CASE
    WHEN timestamp BETWEEN '2018-11-02 18:36:00' AND '2018-11-05 05:30:00'
      OR timestamp >= '2018-11-06 06:27:00' THEN 3 -- minutes
    ELSE 10 -- minutes
    END) FROM snapshots), 2)
    AS "percentage"
  -- COUNT(DISTINCT(question)) AS "questions"
  FROM snapshots
  GROUP BY site
) AS temp ORDER BY percentage DESC