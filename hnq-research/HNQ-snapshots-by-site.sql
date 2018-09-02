SELECT temp.site, temp.percentage AS "% of HNQ", temp.questions AS "# of HNQ", t.number_of_questions AS "# of all Q on site",
  ROUND(100.0 * questions / t.number_of_questions, 2) AS "% of all Q on site"
  FROM (SELECT site, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM snapshots), 2) AS "percentage",
	  COUNT(DISTINCT(question)) AS "questions"
	  FROM snapshots
	  GROUP BY site
	  ORDER BY COUNT(*) DESC
	  ) AS temp
  INNER JOIN total_question_count AS t on t.site = temp.site
  ORDER BY 2 DESC