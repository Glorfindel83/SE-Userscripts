SELECT site, ROUND(AVG(time), 2) AS "average time", COUNT(*) AS "# of Q"
  FROM (
    SELECT site, question, SUM(CASE
    WHEN timestamp BETWEEN '2018-11-02 18:36:00' AND '2018-11-05 05:30:00'
      OR timestamp >= '2018-11-06 06:27:00' THEN 3 -- minutes
    ELSE 10 -- minutes
    END) / 60.0 AS time
      FROM snapshots
      GROUP BY site, question
      ORDER BY COUNT(*) DESC
  ) AS subquery GROUP BY site
ORDER BY AVG(time) DESC