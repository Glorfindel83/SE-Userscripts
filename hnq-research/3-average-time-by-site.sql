SELECT RANK() OVER(ORDER BY AVG(time) DESC),
  site, ROUND(AVG(time), 2) AS "average time", COUNT(*) AS "# of Q"
  FROM (
    -- snapshots are 3 minutes, so 1/20 of an hour, apart
    SELECT site, question, COUNT(*) / 20.0 AS time
      FROM snapshots
	  WHERE timestamp BETWEEN '2020-04-01' AND '2021-04-01'
      GROUP BY site, question
      ORDER BY COUNT(*) DESC
  ) AS subquery GROUP BY site
  ORDER BY AVG(time) DESC