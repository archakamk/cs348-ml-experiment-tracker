-- ML Experiment Tracker — Seed Data
-- Run after schema.sql: psql -U <user> -d <dbname> -f seed.sql

-- ============================================================
-- Users (3)
-- ============================================================
INSERT INTO users (username, email) VALUES
    ('alice',   'alice@example.com'),
    ('bob',     'bob@example.com'),
    ('charlie', 'charlie@example.com');

-- ============================================================
-- Projects (3)
-- ============================================================
INSERT INTO projects (name, description, owner_id) VALUES
    ('Image Classification',  'Benchmarking CNN architectures on image datasets',       1),
    ('NLP Sentiment Analysis', 'Fine-tuning transformers for sentiment classification', 2),
    ('Language Modeling',      'Causal LM experiments with GPT-style models',           3);

-- ============================================================
-- Experiments (5)
-- ============================================================
INSERT INTO experiments (project_id, name, status) VALUES
    (1, 'ResNet CIFAR-10 Baseline',      'completed'),
    (1, 'ResNet ImageNet Transfer',       'running'),
    (2, 'BERT Sentiment Fine-tune',       'completed'),
    (2, 'DistilBERT Sentiment Fine-tune', 'failed'),
    (3, 'GPT2-small WikiText',            'completed');

-- ============================================================
-- Runs (10)
-- ============================================================
INSERT INTO runs (experiment_id, model_name, dataset, epochs, batch_size, learning_rate, optimizer, notes) VALUES
    (1, 'ResNet50',    'CIFAR-10',  50,  64,  0.001,  'Adam',     'Baseline run with default params'),
    (1, 'ResNet50',    'CIFAR-10',  100, 128, 0.0005, 'SGD',      'Longer training with momentum 0.9'),
    (2, 'ResNet50',    'ImageNet',  30,  256, 0.001,  'Adam',     'Transfer learning from CIFAR checkpoint'),
    (2, 'ResNet101',   'ImageNet',  30,  128, 0.0001, 'AdamW',    'Deeper model comparison'),
    (3, 'BERT-base',   'GLUE',      5,   32,  2e-5,   'AdamW',    'Standard fine-tune on SST-2 subset'),
    (3, 'BERT-large',  'GLUE',      3,   16,  1e-5,   'AdamW',    'Larger model, smaller batch'),
    (4, 'DistilBERT',  'GLUE',      5,   32,  3e-5,   'Adam',     'Failed — OOM at epoch 3'),
    (5, 'GPT2-small',  'WikiText-103', 10, 8, 5e-5,   'AdamW',    'Causal LM baseline'),
    (5, 'GPT2-small',  'WikiText-2',   20, 8, 3e-5,   'AdamW',    'Smaller dataset, more epochs'),
    (5, 'GPT2-medium', 'WikiText-103', 10, 4, 2e-5,   'AdamW',    'Scaled-up model');

-- ============================================================
-- Metrics (30)
-- ============================================================
INSERT INTO metrics (run_id, metric_name, metric_value, epoch) VALUES
    -- Run 1: ResNet50 / CIFAR-10 (baseline)
    (1, 'accuracy',  0.8710, 50),
    (1, 'val_loss',  0.4120, 50),
    (1, 'f1_score',  0.8690, 50),
    -- Run 2: ResNet50 / CIFAR-10 (longer)
    (2, 'accuracy',  0.9015, 100),
    (2, 'val_loss',  0.3310, 100),
    (2, 'f1_score',  0.8980, 100),
    -- Run 3: ResNet50 / ImageNet transfer
    (3, 'accuracy',  0.7620, 30),
    (3, 'val_loss',  0.9540, 30),
    (3, 'top5_acc',  0.9300, 30),
    -- Run 4: ResNet101 / ImageNet
    (4, 'accuracy',  0.7830, 30),
    (4, 'val_loss',  0.8910, 30),
    (4, 'top5_acc',  0.9410, 30),
    -- Run 5: BERT-base / GLUE
    (5, 'accuracy',  0.9250, 5),
    (5, 'val_loss',  0.2150, 5),
    (5, 'f1_score',  0.9230, 5),
    -- Run 6: BERT-large / GLUE
    (6, 'accuracy',  0.9340, 3),
    (6, 'val_loss',  0.1980, 3),
    (6, 'f1_score',  0.9310, 3),
    -- Run 7: DistilBERT / GLUE (failed)
    (7, 'accuracy',  0.8100, 2),
    (7, 'val_loss',  0.5600, 2),
    -- Run 8: GPT2-small / WikiText-103
    (8, 'perplexity', 24.3000, 10),
    (8, 'val_loss',   3.1900, 10),
    (8, 'bleu',       0.2100, 10),
    -- Run 9: GPT2-small / WikiText-2
    (9, 'perplexity', 21.7000, 20),
    (9, 'val_loss',   3.0700, 20),
    (9, 'bleu',       0.2400, 20),
    -- Run 10: GPT2-medium / WikiText-103
    (10, 'perplexity', 19.8000, 10),
    (10, 'val_loss',   2.9800, 10),
    (10, 'bleu',       0.2700, 10),
    (10, 'throughput',  1240.0, 10);

-- ============================================================
-- Tags (10)
-- ============================================================
INSERT INTO tags (run_id, tag_name) VALUES
    (1,  'baseline'),
    (2,  'long-train'),
    (3,  'transfer-learning'),
    (4,  'deep-model'),
    (5,  'fine-tune'),
    (6,  'large-model'),
    (7,  'oom-crash'),
    (8,  'causal-lm'),
    (9,  'small-dataset'),
    (10, 'scaled-up');
