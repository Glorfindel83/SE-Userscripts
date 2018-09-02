SELECT site, ROUND(AVG(time), 2) AS "average time", COUNT(*) AS "# of Q"
  FROM (
    SELECT site, question, COUNT(*) / 6.0 AS time
      FROM snapshots
      GROUP BY site, question
      ORDER BY COUNT(*) DESC
  ) AS subquery GROUP BY site
ORDER BY AVG(time) DESC