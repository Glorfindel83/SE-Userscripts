SELECT site, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM snapshots), 2) AS "percentage",
  COUNT(DISTINCT(question)) AS "# of Q"
  FROM snapshots
  GROUP BY site
  ORDER BY COUNT(*) DESC