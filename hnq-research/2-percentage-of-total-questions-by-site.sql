SELECT RANK() OVER (ORDER BY ROUND(100.0 * temp.questions / t.number_of_questions, 2) DESC), 
  temp.site, ROUND(100.0 * temp.questions / t.number_of_questions, 2) AS "% of all Q on site"
  FROM (
SELECT site,
  COUNT(DISTINCT(question)) AS "questions"
  FROM snapshots
  GROUP BY site
) AS temp 
INNER JOIN total_question_count AS t on t.site = temp.site
ORDER BY 3 DESC