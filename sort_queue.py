from app.services.job_ranker import _read_apply_queue, _write_apply_queue

def sort_current_queue():
    print("Reading current queue...")
    queue = _read_apply_queue()
    print(f"Found {len(queue)} items.")
    
    print("Sorting by match_score descending...")
    queue.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    
    print("Saving sorted queue...")
    if _write_apply_queue(queue):
        print("Success! Queue sorted.")
    else:
        print("Failed to write queue.")

if __name__ == "__main__":
    sort_current_queue()
