export class Task {
    constructor({ title, id = null }) {
      this.id = id;
      this.title = title;
    }
  
    to_dict() {
      return {
        id: this.id,
        title: this.title,
      };
    }
  
    static from_dict(data) {
      return new Task({
        title: data.title,
        id: data.id,
      });
    }
  }
  