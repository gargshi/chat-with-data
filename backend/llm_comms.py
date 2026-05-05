from openai import OpenAI

import os

from dotenv import load_dotenv
load_dotenv()

client = OpenAI(
    base_url=os.getenv("LMSTUDIO_BASE_URL"),
    api_key=os.getenv("LMSTUDIO_API_KEY")
)

TIMEOUT = 30  # seconds

def question_to_code(question, df, client):
    prompt = f"""
		You are a data analyst working with a pandas DataFrame called df.

		Columns: {list(df.columns)}

		Convert the user's question into pandas code.		
        Return ONLY Python code inside <code></code> tags.

        STRICT RULES:
        - Do NOT include multiple options
        - Do NOT include "or"
        - Do NOT include explanations
        - Do NOT use print()
        - ALWAYS assign final output to variable `result`

        Example:
        <code>
        result = df.head(1)
        </code>

        Do NOT return any explanations, comments, or markdown formatting.

		User question: {question}
	"""

    response = client.chat.completions.create(
        model=os.getenv("LMSTUDIO_MODEL_NAME"),
        messages=[{"role": "user", "content": prompt}],
        timeout=TIMEOUT
    )

    code = response.choices[0].message.content.strip()
    return code


def classify_intent(question, df, client):
    prompt = f"""
		You are an AI assistant analyzing a dataset.

		Columns: {list(df.columns)}

		Classify the user question into ONE of these categories:

		1. data_query → requires computation (filtering, aggregation, sorting, etc.)
		2. metadata_query → can be answered directly from schema (columns, types, dataset info)
		3. general_question → not related to dataset

		Return ONLY one word: data_query / metadata_query / general_question

		User Question:
		{question}
	"""

    response = client.chat.completions.create(
        model=os.getenv("LMSTUDIO_MODEL_NAME"),
        messages=[{"role": "user", "content": prompt}],
        timeout=TIMEOUT
    )

    return response.choices[0].message.content.strip().lower()


def handle_metadata(question, df):
    q = question.lower()

    if "columns" in q:
        return list(df.columns)

    if "rows" in q:
        return len(df)

    if "data types" in q or "dtype" in q:
        return df.dtypes.astype(str).to_dict()

    return "Basic dataset info retrieved"


def route_question(question, df):
    intent = classify_intent(question, df, client)
    if intent == "metadata_query":
        return {"answer": handle_metadata(question, df)}

    elif intent == "data_query":
        code = question_to_code(question, df, client)
        return {"code": code}

    else:
        return {"error": "Question not related to dataset"}